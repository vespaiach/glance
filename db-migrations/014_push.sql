CREATE TABLE push_subscriptions (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts(id),
  display_id text NOT NULL REFERENCES displays(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE INDEX push_subscriptions_account ON push_subscriptions (account_id);

CREATE TABLE reminder_sends (
  event_id text NOT NULL REFERENCES events(id),
  kind text NOT NULL CHECK (kind IN ('15min', 'start')),
  fire_at timestamptz NOT NULL,
  sent_at timestamptz NOT NULL,
  PRIMARY KEY (event_id, kind, fire_at)
);

CREATE INDEX events_start_at ON events (start_at) WHERE deleted_at IS NULL;
