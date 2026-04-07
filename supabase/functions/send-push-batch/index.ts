import { createClient } from "jsr:@supabase/supabase-js@2";
import { ApplicationServer, importVapidKeys } from "jsr:@negrel/webpush";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

let appServer: ApplicationServer | null = null;

async function getServer() {
  if (appServer) return appServer;
  const keys = await importVapidKeys({
    publicKey: Deno.env.get("VAPID_PUBLIC_KEY")!,
    privateKey: Deno.env.get("VAPID_PRIVATE_KEY")!,
  });
  appServer = await ApplicationServer.new({
    contactInformation: Deno.env.get("VAPID_SUBJECT")!,
    vapidKeys: keys,
  });
  return appServer;
}

Deno.serve(async (_req) => {
  const server = await getServer();

  // Read up to 20 messages from the queue
  const { data: messages } = await supabase.rpc("pgmq_read", {
    queue_name: "push_queue",
    vt: 60, // visibility timeout: 60s
    qty: 20,
  });

  if (!messages?.length) return Response.json({ processed: 0 });

  let processed = 0;

  for (const msg of messages) {
    const { notification_id, user_id, title, body, url, target_app } = msg.message;

    // Get active subscriptions
    let query = supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user_id)
      .eq("is_active", true);

    if (target_app) query = query.eq("app", target_app);

    const { data: subs } = await query;

    if (!subs?.length) {
      // No subscriptions — mark notification as sent (nothing to deliver)
      await supabase
        .from("notifications")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", notification_id);
      await supabase.rpc("pgmq_delete", { queue_name: "push_queue", msg_id: msg.msg_id });
      processed++;
      continue;
    }

    // HIPAA-safe payload: NO PHI, just title + body + deep link
    const payload = JSON.stringify({ title, body, url, tag: notification_id });

    const results = await Promise.allSettled(
      subs.map(async (sub: { id: string; endpoint: string; p256dh: string; auth: string }) => {
        try {
          const subscriber = server.subscribe({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          });
          await subscriber.pushTextMessage(payload, {});

          // Mark subscription healthy
          await supabase
            .from("push_subscriptions")
            .update({
              last_successful_push: new Date().toISOString(),
              consecutive_failures: 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id);
        } catch (err: unknown) {
          const status = (err as { statusCode?: number; status?: number })?.statusCode ??
            (err as { statusCode?: number; status?: number })?.status;
          if (status === 410 || status === 404) {
            // Subscription permanently gone
            await supabase
              .from("push_subscriptions")
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq("id", sub.id);
          } else {
            await supabase.rpc("increment_push_failures", { sub_id: sub.id });
          }
          throw err;
        }
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;

    await supabase
      .from("notifications")
      .update({
        status: sent > 0 ? "sent" : "failed",
        sent_at: new Date().toISOString(),
      })
      .eq("id", notification_id);

    // Acknowledge message in queue
    await supabase.rpc("pgmq_delete", { queue_name: "push_queue", msg_id: msg.msg_id });
    processed++;
  }

  return Response.json({ processed });
});
