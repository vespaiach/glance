CREATE TABLE imports (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts(id),
  for_display_id text REFERENCES displays(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('staged', 'done', 'undone')),
  file_name text NOT NULL,
  bytes integer NOT NULL,
  parsed jsonb,
  who text,
  count integer,
  first_day text NOT NULL,
  last_day text NOT NULL,
  created_at timestamptz NOT NULL,
  imported_at timestamptz
);

CREATE INDEX imports_account ON imports (account_id, created_at);
