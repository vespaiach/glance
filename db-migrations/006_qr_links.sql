ALTER TABLE magic_links
  ALTER COLUMN pending_id DROP NOT NULL,
  ADD COLUMN kind text NOT NULL DEFAULT 'email'
    CONSTRAINT magic_links_kind CHECK (kind IN ('email', 'qr')),
  ADD COLUMN account_id text REFERENCES accounts(id),
  ADD COLUMN display_id text REFERENCES displays(id) ON DELETE CASCADE,
  ADD CONSTRAINT magic_links_shape CHECK (
    (kind = 'email' AND pending_id IS NOT NULL AND account_id IS NULL AND display_id IS NULL)
    OR (kind = 'qr' AND pending_id IS NULL AND account_id IS NOT NULL AND display_id IS NOT NULL)
  );
