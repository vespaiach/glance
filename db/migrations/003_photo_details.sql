ALTER TABLE photos
  ADD COLUMN updated_at timestamptz,
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN title_source text,
  ADD COLUMN date_source text,
  ADD COLUMN place_source text,
  ADD COLUMN checked boolean NOT NULL DEFAULT false;

UPDATE sync_state SET version = version + 1 WHERE id = 1 AND EXISTS (SELECT 1 FROM photos);

UPDATE photos SET
  updated_at = photos.created_at,
  title_source = 'file',
  date_source = CASE
    WHEN photos.taken_on IS NULL
      OR photos.taken_on = (photos.created_at AT TIME ZONE
        coalesce(settings.json -> 'weatherLocation' ->> 'timeZone', accounts.time_zone))::date
    THEN 'file-date'
    ELSE 'photo'
  END,
  place_source = CASE WHEN photos.place IS NULL THEN 'none' ELSE 'photo-location' END,
  checked = true,
  version = (SELECT version FROM sync_state WHERE id = 1)
FROM accounts LEFT JOIN settings ON settings.account_id = accounts.id
WHERE accounts.id = photos.account_id;

ALTER TABLE photos
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN title_source SET NOT NULL,
  ALTER COLUMN date_source SET NOT NULL,
  ALTER COLUMN place_source SET NOT NULL,
  ADD CONSTRAINT photos_title_source
    CHECK (title_source IN ('photo', 'file-name', 'place', 'file', 'edited')),
  ADD CONSTRAINT photos_date_source
    CHECK (date_source IN ('photo', 'file-name', 'file-date', 'none', 'edited')),
  ADD CONSTRAINT photos_place_source
    CHECK (place_source IN ('photo-location', 'none', 'edited'));
