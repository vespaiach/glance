import "server-only";
import type { ImportedEvent } from "@/domain/imports";
import type { ImportRecord, Repos, StagedImport } from "../database";
import type { Sql } from "./sql";

type ImportRow = {
  id: string;
  account_id: string;
  for_display_id: string;
  file_name: string;
  bytes: number;
  status: ImportRecord["status"];
  parsed: ImportedEvent[] | null;
  who: string | null;
  count: number | null;
  first_day: string;
  last_day: string;
  created_at: string;
  imported_at: string | null;
};

export function importsRepo(sql: Sql): Repos["imports"] {
  return {
    insert: async (staged) => {
      await sql.run(
        `INSERT INTO imports (id, account_id, for_display_id, status, file_name, bytes, parsed,
           first_day, last_day, created_at)
         VALUES ($1, $2, $3, 'staged', $4, $5, $6, $7, $8, $9)`,
        [
          staged.id,
          staged.accountId,
          staged.forDisplayId,
          staged.fileName,
          staged.bytes,
          JSON.stringify(staged.events),
          staged.range.first,
          staged.range.last,
          staged.createdAt,
        ],
      );
    },
    newestStaged: async (accountId, forDisplayId, after) => {
      const row = await sql.one<ImportRow>(
        `SELECT * FROM imports WHERE account_id = $1 AND for_display_id = $2
           AND status = 'staged' AND created_at > $3
         ORDER BY created_at DESC, id DESC LIMIT 1`,
        [accountId, forDisplayId, after],
      );

      return row && toStaged(row);
    },
    removeStagedBefore: async (before) => {
      await sql.run("DELETE FROM imports WHERE status = 'staged' AND created_at <= $1", [before]);
    },
    find: async (id) => {
      const row = await sql.one<ImportRow>("SELECT * FROM imports WHERE id = $1", [id]);

      return row && toRecord(row);
    },
    newestImported: async (accountId) => {
      const row = await sql.one<ImportRow>(
        `SELECT * FROM imports WHERE account_id = $1 AND status <> 'staged'
         ORDER BY imported_at DESC, id DESC LIMIT 1`,
        [accountId],
      );

      return row && toRecord(row);
    },
    markDone: async (id, done) => {
      const changed = await sql.run(
        `UPDATE imports SET status = 'done', parsed = NULL, who = $2, count = $3, imported_at = $4
         WHERE id = $1 AND status = 'staged'`,
        [id, done.who, done.count, done.importedAt],
      );

      return changed === 1;
    },
    markUndone: async (id) => {
      const changed = await sql.run(
        "UPDATE imports SET status = 'undone' WHERE id = $1 AND status = 'done'",
        [id],
      );

      return changed === 1;
    },
  };
}

function toStaged(row: ImportRow): StagedImport {
  return {
    id: row.id,
    accountId: row.account_id,
    forDisplayId: row.for_display_id,
    fileName: row.file_name,
    bytes: row.bytes,
    events: row.parsed ?? [],
    range: { first: row.first_day, last: row.last_day },
    createdAt: row.created_at,
  };
}

function toRecord(row: ImportRow): ImportRecord {
  return {
    ...toStaged(row),
    status: row.status,
    who: row.who,
    count: row.count,
    importedAt: row.imported_at,
  };
}
