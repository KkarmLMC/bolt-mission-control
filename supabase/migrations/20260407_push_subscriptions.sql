-- Push subscription storage (multi-app)
CREATE TABLE push_subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app                   TEXT NOT NULL CHECK (app IN ('admin', 'caregiver', 'family')),
  origin                TEXT NOT NULL,
  endpoint              TEXT NOT NULL,
  p256dh                TEXT NOT NULL,
  auth                  TEXT NOT NULL,
  user_agent            TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  consecutive_failures  INT NOT NULL DEFAULT 0,
  last_successful_push  TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_push_endpoint UNIQUE (endpoint)
);

CREATE INDEX idx_push_subs_user_app
  ON push_subscriptions(user_id, app) WHERE is_active = TRUE;

-- RLS: users manage own subscriptions, service_role reads all
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Notification queue (outbound)
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  target_app  TEXT CHECK (target_app IN ('admin', 'caregiver', 'family')),
  url         TEXT DEFAULT '/',
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_pending
  ON notifications(created_at) WHERE status = 'pending';

-- Helper: increment failure count
CREATE OR REPLACE FUNCTION increment_push_failures(sub_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE push_subscriptions
  SET consecutive_failures = consecutive_failures + 1,
      is_active = CASE WHEN consecutive_failures + 1 >= 5 THEN FALSE ELSE is_active END,
      updated_at = NOW()
  WHERE id = sub_id;
END $$;

-- Trigger: enqueue to pgmq on notification insert
CREATE OR REPLACE FUNCTION enqueue_push_notification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pgmq.send('push_queue', jsonb_build_object(
    'notification_id', NEW.id,
    'user_id', NEW.user_id,
    'title', NEW.title,
    'body', NEW.body,
    'url', NEW.url,
    'target_app', NEW.target_app
  ));
  RETURN NEW;
END $$;

CREATE TRIGGER trg_enqueue_push
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION enqueue_push_notification();

-- pg_cron: process queue every 15 seconds
SELECT cron.schedule('process-push-queue', '15 seconds',
  $$SELECT net.http_post(
    url := current_setting('app.settings.edge_functions_url') || '/send-push-batch',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);

-- Weekly cleanup: purge inactive subscriptions older than 30 days
SELECT cron.schedule('cleanup-dead-subs', '0 3 * * 0',
  $$DELETE FROM push_subscriptions
    WHERE is_active = FALSE AND updated_at < NOW() - INTERVAL '30 days'$$
);
