CREATE TABLE members (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts(id),
  name text NOT NULL,
  color text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz,
  version bigint NOT NULL,
  CONSTRAINT members_color CHECK (color IN ('lilac', 'sky', 'coral', 'mint', 'sun', 'pink',
    'lime', 'rust', 'glacier', 'amber', 'sage', 'ice'))
);

CREATE UNIQUE INDEX members_account_name ON members (account_id, lower(name))
  WHERE deleted_at IS NULL;

ALTER TABLE events
  ADD COLUMN everyone boolean NOT NULL DEFAULT true,
  ADD COLUMN member_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN notes text,
  DROP COLUMN tone,
  ADD CONSTRAINT events_everyone_no_members CHECK (NOT everyone OR cardinality(member_ids) = 0);

UPDATE sync_state SET version = version + 1
WHERE id = 1 AND EXISTS (SELECT 1 FROM accounts WHERE name IS NOT NULL);

INSERT INTO members (id, account_id, name, color, created_at, updated_at, version)
SELECT gen_random_uuid()::text, accounts.id, accounts.name, 'lilac', accounts.created_at, now(),
  (SELECT version FROM sync_state WHERE id = 1)
FROM accounts
WHERE accounts.name IS NOT NULL;
