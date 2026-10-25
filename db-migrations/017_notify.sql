ALTER TABLE events ADD COLUMN notify boolean NOT NULL DEFAULT true;

UPDATE events SET notify = false WHERE reminder = 'off';

ALTER TABLE events DROP COLUMN reminder;

DELETE FROM reminder_sends WHERE kind = 'start';

ALTER TABLE reminder_sends DROP CONSTRAINT reminder_sends_kind_check;

ALTER TABLE reminder_sends ADD CONSTRAINT reminder_sends_kind_check CHECK (kind IN ('15min', '30min'));

WITH families AS (
  SELECT account_id, row_number() OVER (ORDER BY account_id) AS n FROM settings
)
UPDATE settings SET
  json = (settings.json - 'defaultReminder') || jsonb_build_object(
    'notifyLead', CASE settings.json ->> 'defaultReminder'
      WHEN 'off' THEN '"off"'::jsonb
      ELSE '15'::jsonb
    END
  ),
  version = (SELECT version FROM sync_state WHERE id = 1) + families.n
FROM families
WHERE settings.account_id = families.account_id;

UPDATE sync_state SET version = version + (SELECT count(*) FROM settings)
WHERE id = 1;
