CREATE TABLE api_keys (
  account_id text PRIMARY KEY REFERENCES accounts(id),
  key_hash text NOT NULL UNIQUE,
  tail text NOT NULL,
  created_at timestamptz NOT NULL,
  last_used_at timestamptz
);
