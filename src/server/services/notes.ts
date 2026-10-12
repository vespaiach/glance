import "server-only";
import type Database from "better-sqlite3";
import { err, ok, type Result } from "@/domain/result";
import type { Note, NoteTone, Synced } from "@/domain/schemas";
import type { ServiceDeps } from "./deps";
import { type ServerColumns, type Stamp, serverFields, stamp, toneFromColumn } from "./rows";

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
): Result<SyncedNote, "not-found"> {
  return db.transaction((): Result<SyncedNote, "not-found"> => {
    const existing = noteRow(db, note.id);

    if (existing && existing.account_id !== accountId) return err("not-found");

    if (existing?.deleted_at) return ok(toNote(existing));

    const stamped = stamp(db, now());

    writeNote(db, accountId, note, stamped);

    return ok({ ...note, ...stamped });
  })();
}

export function deleteNote(
  { db, now }: ServiceDeps,
  accountId: string,
  id: string,
): Result<SyncedNote, "not-found"> {
  return db.transaction((): Result<SyncedNote, "not-found"> => {
    const existing = noteRow(db, id);

    if (existing?.account_id !== accountId) return err("not-found");

    if (existing.deleted_at) return ok(toNote(existing));

    const { updatedAt, version } = stamp(db, now());

    db.prepare("UPDATE notes SET deleted_at = ?, updated_at = ?, version = ? WHERE id = ?").run(
      updatedAt,
      updatedAt,
      version,
      id,
    );

    return ok(toNote({ ...existing, deleted_at: updatedAt, updated_at: updatedAt, version }));
  })();
}

function noteRow(db: Database.Database, id: string): NoteRow | undefined {
  return db.prepare("SELECT * FROM notes WHERE id = ?").get(id) as NoteRow | undefined;
}

function writeNote(
  db: Database.Database,
  accountId: string,
  note: Note,
  { updatedAt, version }: Stamp,
): void {
  db.prepare(
    `INSERT INTO notes (id, account_id, text, author, tone, rotation, created_at, updated_at, version)
     VALUES (@id, @accountId, @text, @author, @tone, @rotation, @createdAt, @updatedAt, @version)
     ON CONFLICT (id) DO UPDATE SET text = @text, author = @author, tone = @tone,
       rotation = @rotation, created_at = @createdAt, updated_at = @updatedAt, version = @version`,
  ).run({ ...note, accountId, tone: String(note.tone), updatedAt, version });
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
