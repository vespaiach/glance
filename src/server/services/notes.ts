import "server-only";
import { err, ok, type Result } from "@/domain/result";
import type { Note, NoteTone, Synced } from "@/domain/schemas";
import type { Db } from "../db/db";
import type { ServiceDeps } from "./deps";
import {
  lockVersions,
  type ServerColumns,
  type Stamp,
  serverFields,
  stamp,
  toneFromColumn,
} from "./rows";

export type SyncedNote = Synced<Note>;

export type NoteRow = ServerColumns & {
  id: string;
  account_id: string;
  text: string;
  author: string;
  tone: string;
  rotation: number;
  created_at: string;
};

export function putNote(
  { db, now }: ServiceDeps,
  accountId: string,
  note: Note,
): Promise<Result<SyncedNote, "not-found">> {
  return db.tx(async (tx): Promise<Result<SyncedNote, "not-found">> => {
    await lockVersions(tx);

    const existing = await noteRow(tx, note.id);

    if (existing && existing.account_id !== accountId) return err("not-found");

    if (existing?.deleted_at) return ok(toNote(existing));

    const stamped = await stamp(tx, now());

    await writeNote(tx, accountId, note, stamped);

    return ok({ ...note, ...stamped });
  });
}

export function deleteNote(
  { db, now }: ServiceDeps,
  accountId: string,
  id: string,
): Promise<Result<SyncedNote, "not-found">> {
  return db.tx(async (tx): Promise<Result<SyncedNote, "not-found">> => {
    await lockVersions(tx);

    const existing = await noteRow(tx, id);

    if (existing?.account_id !== accountId) return err("not-found");

    if (existing.deleted_at) return ok(toNote(existing));

    const { updatedAt, version } = await stamp(tx, now());

    await tx.run("UPDATE notes SET deleted_at = $1, updated_at = $1, version = $2 WHERE id = $3", [
      updatedAt,
      version,
      id,
    ]);

    return ok(toNote({ ...existing, deleted_at: updatedAt, updated_at: updatedAt, version }));
  });
}

function noteRow(db: Db, id: string): Promise<NoteRow | undefined> {
  return db.one<NoteRow>("SELECT * FROM notes WHERE id = $1", [id]);
}

async function writeNote(
  db: Db,
  accountId: string,
  note: Note,
  { updatedAt, version }: Stamp,
): Promise<void> {
  await db.run(
    `INSERT INTO notes (id, account_id, text, author, tone, rotation, created_at, updated_at, version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO UPDATE SET text = excluded.text, author = excluded.author,
       tone = excluded.tone, rotation = excluded.rotation, created_at = excluded.created_at,
       updated_at = excluded.updated_at, version = excluded.version`,
    [
      note.id,
      accountId,
      note.text,
      note.author,
      String(note.tone),
      note.rotation,
      note.createdAt,
      updatedAt,
      version,
    ],
  );
}

export function toNote(row: NoteRow): SyncedNote {
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
