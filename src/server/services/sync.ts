import "server-only";
import type Database from "better-sqlite3";
import type { AccountSettings } from "@/domain/schemas";
import type { ServiceDeps } from "./deps";
import { type EventRow, type SyncedEvent, toEvent } from "./events";
import { type NoteRow, type SyncedNote, toNote } from "./notes";
import { type PhotoRow, type SyncedPhoto, toPhoto } from "./photos";
import type { SyncedSettings } from "./settings";

export type SyncChange =
  | { entity: "events"; row: SyncedEvent }
  | { entity: "notes"; row: SyncedNote }
  | { entity: "photos"; row: SyncedPhoto }
  | { entity: "settings"; row: SyncedSettings };

export type SyncPull = { cursor: string; changes: SyncChange[] };

type SettingsRow = { account_id: string; json: string; updated_at: string; version: number };

export function pullChanges(
  { db }: ServiceDeps,
  accountId: string,
  since: number | undefined,
): SyncPull {
  return db.transaction((): SyncPull => {
    const after = since ?? 0;

    const changes = [
      ...changedRows<EventRow>(db, "events", accountId, after).map(
        (row): SyncChange => ({ entity: "events", row: toEvent(row) }),
      ),
      ...changedRows<NoteRow>(db, "notes", accountId, after).map(
        (row): SyncChange => ({ entity: "notes", row: toNote(row) }),
      ),
      ...changedRows<PhotoRow>(db, "photos", accountId, after).map(
        (row): SyncChange => ({ entity: "photos", row: toPhoto(row) }),
      ),
      ...changedRows<SettingsRow>(db, "settings", accountId, after).map(
        (row): SyncChange => ({ entity: "settings", row: toSettings(row) }),
      ),
    ];

    return { cursor: String(currentVersion(db)), changes: byVersion(changes) };
  })();
}

function changedRows<T>(
  db: Database.Database,
  table: SyncChange["entity"],
  accountId: string,
  after: number,
): T[] {
  return db
    .prepare(`SELECT * FROM ${table} WHERE account_id = ? AND version > ?`)
    .all(accountId, after) as T[];
}

function currentVersion(db: Database.Database): number {
  return (db.prepare("SELECT version FROM sync_state WHERE id = 1").get() as { version: number })
    .version;
}

function byVersion(changes: SyncChange[]): SyncChange[] {
  return changes.sort((a, b) => a.row.version - b.row.version);
}

function toSettings(row: SettingsRow): SyncedSettings {
  return {
    ...(JSON.parse(row.json) as AccountSettings),
    accountId: row.account_id,
    updatedAt: row.updated_at,
    version: row.version,
  };
}
