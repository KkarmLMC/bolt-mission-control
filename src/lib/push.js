import { db } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const APP_NAME = import.meta.env.VITE_PWA_APP_NAME || 'mission-control';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export async function subscribeToPush() {
  if (!('PushManager' in window) || !VAPID_PUBLIC_KEY) return null;

  const registration = await navigator.serviceWorker.ready;

  // Check existing subscription first
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const subJson = subscription.toJSON();

  // Upsert to Supabase (keyed on endpoint)
  const { error } = await db.from('push_subscriptions').upsert(
    {
      user_id: (await db.auth.getUser()).data.user?.id,
      app: APP_NAME,
      origin: window.location.origin,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
      user_agent: navigator.userAgent,
      is_active: true,
      consecutive_failures: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );

  if (error) console.error('Failed to save push subscription:', error);
  return subscription;
}

export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    await db
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('endpoint', endpoint);
  }
}

export function getPushPermissionState() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}
