ALTER TABLE events ADD COLUMN import_id text REFERENCES imports(id);

CREATE INDEX events_import ON events (import_id) WHERE import_id IS NOT NULL;
