ALTER TABLE events ADD COLUMN reminder text NOT NULL DEFAULT '15min'
  CONSTRAINT events_reminder CHECK (reminder IN ('off', 'start', '15min', 'both'));
