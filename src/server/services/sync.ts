import "server-only";
import type { AccountSettings } from "@/domain/schemas";
import type { Db } from "../db/db";
import type { ServiceDeps } from "./deps";
import { type EventRow, type SyncedEvent, toEvent } from "./events";
import { type MemberRow, type SyncedMember, toMember } from "./members";
import { type NoteRow, type SyncedNote, toNote } from "./notes";
import { type PhotoRow, type SyncedPhoto, toPhoto } from "./photos";
import type { SyncedSettings } from "./settings";

export type SyncChange =
  | { entity: "members"; row: SyncedMember }
  | { entity: "events"; row: SyncedEvent }
  | { entity: "notes"; row: SyncedNote }
  | { entity: "photos"; row: SyncedPhoto }
  | { entity: "settings"; row: SyncedSettings };

export type SyncPull = { cursor: string; changes: SyncChange[] };

type SettingsRow = {
  account_id: string;
  json: AccountSettings;
  updated_at: string;
  version: number;
};

export function pullChanges(
  { db }: ServiceDeps,
  accountId: string,
  since: number | undefined,
): Promise<SyncPull> {
  return db.tx(async (tx): Promise<SyncPull> => {
    await tx.exec("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");

    const after = since ?? 0;

    const members = await changedRows<MemberRow>(tx, "members", accountId, after);

    const events = await changedRows<EventRow>(tx, "events", accountId, after);

    const notes = await changedRows<NoteRow>(tx, "notes", accountId, after);

    const photos = await changedRows<PhotoRow>(tx, "photos", accountId, after);

    const settings = await changedRows<SettingsRow>(tx, "settings", accountId, after);

    const changes = [
      ...members.map((row): SyncChange => ({ entity: "members", row: toMember(row) })),
      ...events.map((row): SyncChange => ({ entity: "events", row: toEvent(row) })),
      ...notes.map((row): SyncChange => ({ entity: "notes", row: toNote(row) })),
      ...photos.map((row): SyncChange => ({ entity: "photos", row: toPhoto(row) })),
      ...settings.map((row): SyncChange => ({ entity: "settings", row: toSettings(row) })),
    ];

    return { cursor: String(await currentVersion(tx)), changes: byVersion(changes) };
  });
}

function changedRows<T>(
  db: Db,
  table: SyncChange["entity"],
  accountId: string,
  after: number,
): Promise<T[]> {
  return db.all<T>(`SELECT * FROM ${table} WHERE account_id = $1 AND version > $2`, [
    accountId,
    after,
  ]);
}

async function currentVersion(db: Db): Promise<number> {
  const row = await db.one<{ version: number }>("SELECT version FROM sync_state WHERE id = 1");

  return (row as { version: number }).version;
}

function byVersion(changes: SyncChange[]): SyncChange[] {
  return changes.sort((a, b) => a.row.version - b.row.version);
}

function toSettings(row: SettingsRow): SyncedSettings {
  return {
    ...row.json,
    accountId: row.account_id,
    updatedAt: row.updated_at,
    version: row.version,
  };
}
