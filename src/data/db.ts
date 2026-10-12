import Dexie, { type EntityTable } from "dexie";
import type {
  AccountSettings,
  CalendarEvent,
  Note,
  Photo,
  Synced,
  Weather,
} from "@/domain/schemas";

export type StoredEvent = Synced<CalendarEvent>;

export type StoredNote = Synced<Note>;

export type StoredPhoto = Synced<Photo>;

export type StoredSettings = Synced<AccountSettings> & { accountId: string };

export type StoredWeather = Weather & { accountId: string };

export type SyncedEntity = "events" | "notes" | "photos" | "settings";

export type OutboxEntry = {
  seq: number;
  entity: SyncedEntity;
  entityId: string;
  op: "put" | "delete";
  payload?: unknown;
  attempts: number;
};

export type MetaEntry = { key: string; value: unknown };

export type GlanceDb = Dexie & {
  events: EntityTable<StoredEvent, "id">;
  notes: EntityTable<StoredNote, "id">;
  photos: EntityTable<StoredPhoto, "id">;
  settings: EntityTable<StoredSettings, "accountId">;
  weather: EntityTable<StoredWeather, "accountId">;
  outbox: EntityTable<OutboxEntry, "seq">;
  meta: EntityTable<MetaEntry, "key">;
};

export const FIXTURE_DB_NAME = "glance-fixture";

export const CURSOR_KEY = "cursor";

export function accountDbName(accountId: string): string {
  return `glance-${accountId}`;
}

export function openGlanceDb(name: string): GlanceDb {
  const db = new Dexie(name) as GlanceDb;

  db.version(1).stores({
    events: "id, startAt, deletedAt",
    notes: "id, createdAt, deletedAt",
    photos: "id, createdAt",
    settings: "accountId",
    weather: "accountId",
    outbox: "++seq, entity, entityId",
    meta: "key",
  });

  return db;
}

export function deleteGlanceDb(name: string): Promise<void> {
  return Dexie.delete(name);
}
