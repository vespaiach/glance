CREATE TABLE sign_in_codes (
  email text PRIMARY KEY,
  code_hash text NOT NULL,
  time_zone text NOT NULL,
  tries integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL
);

DELETE FROM magic_links WHERE kind = 'email';

ALTER TABLE magic_links
  DROP CONSTRAINT magic_links_shape,
  DROP COLUMN kind,
  DROP COLUMN email,
  DROP COLUMN time_zone,
  DROP COLUMN pending_id,
  ALTER COLUMN account_id SET NOT NULL,
  ALTER COLUMN display_id SET NOT NULL;
