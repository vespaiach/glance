ALTER TABLE events ADD COLUMN all_day boolean NOT NULL DEFAULT false;

ALTER TABLE events ADD CONSTRAINT events_all_day_no_end CHECK (NOT all_day OR end_at IS NULL);
