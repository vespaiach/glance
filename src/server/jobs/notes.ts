import "server-only";
import type Database from "better-sqlite3";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { noteExpired } from "@/domain/notes";
import type { AccountSettings } from "@/domain/schemas";
import type { ServiceDeps } from "../services/deps";
import { stamp } from "../services/rows";

export type Expired = { accountId: string; version: number };

type NoteExpiry = AccountSettings["noteExpiry"];

type LiveNote = { id: string; account_id: string; created_at: string };

export function expireNotes({ db, now }: ServiceDeps): Expired[] {
  const at = now();

  return db.transaction(() => {
    const expiries = noteExpiries(db);

    const expired = liveNotes(db).filter((note) =>
      noteExpired({ createdAt: note.created_at }, expiries.get(note.account_id) ?? null, at),
    );

    const versions = new Map<string, number>();

    for (const note of expired) versions.set(note.account_id, softDelete(db, note.id, at));

    return [...versions].map(([accountId, version]) => ({ accountId, version }));
  })();
}

function liveNotes(db: Database.Database): LiveNote[] {
  return db
    .prepare(
      "SELECT id, account_id, created_at FROM notes WHERE deleted_at IS NULL ORDER BY account_id, id",
    )
    .all() as LiveNote[];
}

function noteExpiries(db: Database.Database): Map<string, NoteExpiry> {
  const rows = db
    .prepare(
      "SELECT accounts.id, settings.json FROM accounts LEFT JOIN settings ON settings.account_id = accounts.id",
    )
    .all() as { id: string; json: string | null }[];

  return new Map(rows.map((row) => [row.id, savedExpiry(row.json)]));
}

function savedExpiry(json: string | null): NoteExpiry {
  return json === null
    ? DEFAULT_SETTINGS.noteExpiry
    : (JSON.parse(json) as AccountSettings).noteExpiry;
}

function softDelete(db: Database.Database, id: string, at: Date): number {
  const { updatedAt, version } = stamp(db, at);

  db.prepare("UPDATE notes SET deleted_at = ?, updated_at = ?, version = ? WHERE id = ?").run(
    updatedAt,
    updatedAt,
    version,
    id,
  );

  return version;
}
