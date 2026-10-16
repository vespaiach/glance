ALTER TABLE displays
  ADD COLUMN kind text NOT NULL DEFAULT 'monitor'
    CONSTRAINT displays_kind CHECK (kind IN ('monitor', 'tablet', 'smartphone')),
  ADD COLUMN browser text;
