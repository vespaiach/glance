WITH families AS (
  SELECT account_id, row_number() OVER (ORDER BY account_id) AS n FROM settings
)
UPDATE settings SET
  json = settings.json || jsonb_build_object(
    'idleTimeout', CASE settings.json ->> 'idleTimeout'
      WHEN '60' THEN '{"on": true, "minutes": 1}'::jsonb
      WHEN '180' THEN '{"on": true, "minutes": 3}'::jsonb
      WHEN '300' THEN '{"on": true, "minutes": 5}'::jsonb
      ELSE '{"on": false, "minutes": 3}'::jsonb
    END,
    'noteExpiry', CASE settings.json ->> 'noteExpiry'
      WHEN '1d' THEN '{"on": true, "days": 1}'::jsonb
      WHEN '1w' THEN '{"on": true, "days": 7}'::jsonb
      ELSE '{"on": false, "days": 7}'::jsonb
    END,
    'hideSidebarWhenIdle', true
  ),
  version = (SELECT version FROM sync_state WHERE id = 1) + families.n
FROM families
WHERE settings.account_id = families.account_id;

UPDATE sync_state SET version = version + (SELECT count(*) FROM settings)
WHERE id = 1;
