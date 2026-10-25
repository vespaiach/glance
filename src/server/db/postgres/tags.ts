import "server-only";
import type { Tag } from "@/domain/schemas";
import type { Owned, Repos, StoredTag } from "../database";
import { type ServerColumns, serverFields } from "./rows";
import type { Sql } from "./sql";

type TagRow = ServerColumns & {
  id: string;
  account_id: string;
  name: string;
  color: Tag["color"];
  created_at: string;
};

export function tagsRepo(sql: Sql): Repos["tags"] {
  return {
    find: async (id) => {
      const row = await sql.one<TagRow>("SELECT * FROM tags WHERE id = $1", [id]);

      return row && owned(row);
    },
    save: (accountId, tag) => saveTag(sql, accountId, tag),
    hasAny: async (accountId) =>
      (await sql.one("SELECT 1 FROM tags WHERE account_id = $1", [accountId])) !== undefined,
    liveCount: async (accountId) => {
      const row = await sql.one<{ count: number }>(
        "SELECT count(*)::int AS count FROM tags WHERE account_id = $1 AND deleted_at IS NULL",
        [accountId],
      );

      return row?.count ?? 0;
    },
    liveIds: async (accountId, ids) => {
      const rows = await sql.all<{ id: string }>(
        "SELECT id FROM tags WHERE account_id = $1 AND deleted_at IS NULL AND id = ANY($2)",
        [accountId, ids],
      );

      return new Set(rows.map((row) => row.id));
    },
    liveByName: async (accountId, name) => {
      const row = await sql.one<TagRow>(
        "SELECT * FROM tags WHERE account_id = $1 AND deleted_at IS NULL AND lower(name) = lower($2)",
        [accountId, name],
      );

      return row && toTag(row);
    },
    changedSince: async (accountId, version) => {
      const rows = await sql.all<TagRow>(
        "SELECT * FROM tags WHERE account_id = $1 AND version > $2 ORDER BY version",
        [accountId, version],
      );

      return rows.map(toTag);
    },
  };
}

function owned(row: TagRow): Owned<StoredTag> {
  return { accountId: row.account_id, value: toTag(row) };
}

function toTag(row: TagRow): StoredTag {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
    ...serverFields(row),
  };
}

async function saveTag(sql: Sql, accountId: string, tag: StoredTag): Promise<void> {
  await sql.run(
    `INSERT INTO tags (id, account_id, name, color, created_at, updated_at, deleted_at, version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET name = excluded.name, color = excluded.color,
       updated_at = excluded.updated_at, deleted_at = excluded.deleted_at,
       version = excluded.version`,
    [
      tag.id,
      accountId,
      tag.name,
      tag.color,
      tag.createdAt,
      tag.updatedAt,
      tag.deletedAt ?? null,
      tag.version,
    ],
  );
}
