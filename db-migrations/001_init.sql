CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE accounts (
  id text PRIMARY KEY,
  email citext NOT NULL UNIQUE,
  name text,
  time_zone text NOT NULL,
  setup_done_at timestamptz,
  created_at timestamptz NOT NULL
);

CREATE TABLE displays (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts(id),
  last_seen_at timestamptz
);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  display_id text NOT NULL REFERENCES displays(id),
  created_at timestamptz NOT NULL
);

CREATE TABLE magic_links (
  token_hash text PRIMARY KEY,
  email text NOT NULL,
  pending_id text NOT NULL,
  time_zone text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE TABLE events (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts(id),
  title text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  location text,
  tone text NOT NULL DEFAULT '1',
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz,
  version bigint NOT NULL,
  CHECK (end_at IS NULL OR end_at > start_at)
);

CREATE TABLE notes (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts(id),
  text text NOT NULL,
  author text NOT NULL DEFAULT 'Guest',
  tone text NOT NULL,
  rotation double precision NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz,
  version bigint NOT NULL
);

CREATE TABLE photos (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts(id),
  title text NOT NULL,
  taken_on date,
  place text,
  file_path text NOT NULL,
  created_at timestamptz NOT NULL,
  version bigint NOT NULL
);

CREATE TABLE settings (
  account_id text PRIMARY KEY REFERENCES accounts(id),
  json jsonb NOT NULL,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL
);

CREATE TABLE weather_cache (
  account_id text PRIMARY KEY,
  location text NOT NULL,
  json text NOT NULL,
  fetched_at timestamptz NOT NULL
);

CREATE TABLE sync_state (
  id integer PRIMARY KEY CHECK (id = 1),
  version bigint NOT NULL
);

INSERT INTO sync_state (id, version) VALUES (1, 0);

CREATE INDEX events_account_start ON events(account_id, start_at);

CREATE INDEX notes_account_created ON notes(account_id, created_at);
