import "server-only";
import type { NoteTone } from "@/domain/schemas";
import type { Owned, Repos, StoredNote } from "../database";
import { type ServerColumns, serverFields, toneFromColumn } from "./rows";
import type { Sql } from "./sql";

type NoteRow = ServerColumns & {
  id: string;
  account_id: string;
  text: string;
  author: string;
  tone: string;
  rotation: number;
  created_at: string;
};

export function notesRepo(sql: Sql): Repos["notes"] {
  return {
    find: async (id) => {
      const row = await sql.one<NoteRow>("SELECT * FROM notes WHERE id = $1", [id]);

      return row && owned(row);
    },
    save: (accountId, note) => saveNote(sql, accountId, note),
    live: async () => {
      const rows = await sql.all<NoteRow>(
        "SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY account_id, id",
      );

      return rows.map(owned);
    },
    changedSince: async (accountId, version) => {
      const rows = await sql.all<NoteRow>(
        "SELECT * FROM notes WHERE account_id = $1 AND version > $2 ORDER BY version",
        [accountId, version],
      );

      return rows.map(toNote);
    },
  };
}

function owned(row: NoteRow): Owned<StoredNote> {
  return { accountId: row.account_id, value: toNote(row) };
}

function toNote(row: NoteRow): StoredNote {
  return {
    id: row.id,
    text: row.text,
    author: row.author,
    createdAt: row.created_at,
    tone: toneFromColumn<NoteTone>(row.tone),
    rotation: row.rotation,
    ...serverFields(row),
  };
}

async function saveNote(sql: Sql, accountId: string, note: StoredNote): Promise<void> {
  await sql.run(
    `INSERT INTO notes (id, account_id, text, author, tone, rotation, created_at, updated_at,
       deleted_at, version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO UPDATE SET text = excluded.text, author = excluded.author,
       tone = excluded.tone, rotation = excluded.rotation, created_at = excluded.created_at,
       updated_at = excluded.updated_at, deleted_at = excluded.deleted_at,
       version = excluded.version`,
    [
      note.id,
      accountId,
      note.text,
      note.author,
      String(note.tone),
      note.rotation,
      note.createdAt,
      note.updatedAt,
      note.deletedAt ?? null,
      note.version,
    ],
  );
}
