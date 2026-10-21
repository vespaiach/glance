ALTER TABLE members RENAME TO tags;
ALTER INDEX members_pkey RENAME TO tags_pkey;
ALTER INDEX members_account_name RENAME TO tags_account_name;
ALTER TABLE tags RENAME CONSTRAINT members_color TO tags_color;
ALTER TABLE tags RENAME CONSTRAINT members_account_id_fkey TO tags_account_id_fkey;

ALTER TABLE events RENAME COLUMN member_ids TO tag_ids;
ALTER TABLE events RENAME CONSTRAINT events_everyone_no_members TO events_everyone_no_tags;

DELETE FROM tags WHERE deleted_at IS NOT NULL;

WITH families AS (
  SELECT account_id, row_number() OVER (ORDER BY account_id) AS n
  FROM (SELECT DISTINCT account_id FROM tags) AS named
)
UPDATE tags SET version = (SELECT version FROM sync_state WHERE id = 1) + families.n
FROM families
WHERE tags.account_id = families.account_id;

UPDATE sync_state SET version = version + (SELECT count(DISTINCT account_id) FROM tags)
WHERE id = 1;
