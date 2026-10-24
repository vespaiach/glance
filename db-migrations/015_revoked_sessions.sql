CREATE TABLE revoked_sessions (
  token_hash text PRIMARY KEY,
  revoked_at timestamptz NOT NULL
);

CREATE INDEX revoked_sessions_revoked_at ON revoked_sessions (revoked_at);
