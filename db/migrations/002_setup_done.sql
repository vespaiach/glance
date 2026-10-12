ALTER TABLE accounts ADD COLUMN setup_done_at TEXT;

UPDATE accounts SET setup_done_at = created_at;
