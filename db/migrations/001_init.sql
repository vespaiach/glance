CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT,
  time_zone TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE displays (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  last_seen_at TEXT
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  display_id TEXT NOT NULL REFERENCES displays(id),
  created_at TEXT NOT NULL
);

CREATE TABLE magic_links (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  pending_id TEXT NOT NULL,
  time_zone TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  title TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT,
  location TEXT,
  tone TEXT NOT NULL DEFAULT '1',
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER NOT NULL,
  CHECK (end_at IS NULL OR end_at > start_at)
);

CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  text TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Guest',
  tone TEXT NOT NULL,
  rotation REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER NOT NULL
);

CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  title TEXT NOT NULL,
  taken_on TEXT,
  place TEXT,
  file_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL
);

CREATE TABLE settings (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id),
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL
);

CREATE TABLE weather_cache (
  account_id TEXT PRIMARY KEY,
  location TEXT NOT NULL,
  json TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);

CREATE TABLE sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL
);

INSERT INTO sync_state (id, version) VALUES (1, 0);

CREATE INDEX events_account_start ON events(account_id, start_at);

CREATE INDEX notes_account_created ON notes(account_id, created_at);
