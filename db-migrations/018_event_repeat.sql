ALTER TABLE events ADD COLUMN repeat text
  CONSTRAINT events_repeat CHECK (repeat IN ('weekly'));
