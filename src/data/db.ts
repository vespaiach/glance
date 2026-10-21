import Dexie, { type EntityTable, type Transaction } from "dexie";
import type {
  AccountSettings,
  CalendarEvent,
  Note,
  Photo,
  Synced,
  Tag,
  Weather,
} from "@/domain/schemas";

export type StoredEvent = Synced<CalendarEvent>;

export type StoredTag = Synced<Tag>;

export type StoredNote = Synced<Note>;

export type StoredPhoto = Synced<Photo>;

export type StoredSettings = Synced<AccountSettings> & { accountId: string };

export type StoredWeather = Weather & { accountId: string };

export type SyncedEntity = "tags" | "events" | "notes" | "photos" | "settings";

export type OutboxEntry = {
  seq: number;
  entity: SyncedEntity;
  entityId: string;
  op: "put" | "delete";
  payload?: unknown;
  attempts: number;
};

type MemberEntry = Omit<OutboxEntry, "entity"> & { entity: "members" };

export type MetaEntry = { key: string; value: unknown };

export type GlanceDb = Dexie & {
  events: EntityTable<StoredEvent, "id">;
  tags: EntityTable<StoredTag, "id">;
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

  db.version(2)
    .stores({ members: "id, createdAt, deletedAt" })
    .upgrade((tx) =>
      tx
        .table("events")
        .toCollection()
        .modify((event: Record<string, unknown>) => {
          delete event.tone;
          event.everyone = true;
          event.memberIds = [];
        }),
    );

  db.version(3)
    .stores({ tags: "id, createdAt, deletedAt", members: null })
    .upgrade(async (tx) => {
      await copyLiveMembers(tx);

      await renameEventTags(tx);

      await moveMemberOutbox(tx);
    });

  return db;
}

export function deleteGlanceDb(name: string): Promise<void> {
  return Dexie.delete(name);
}

async function copyLiveMembers(tx: Transaction): Promise<void> {
  const members = await tx.table("members").toArray();

  await tx.table("tags").bulkPut(members.filter((member) => member.deletedAt === undefined));
}

async function renameEventTags(tx: Transaction): Promise<void> {
  await tx.table("events").toCollection().modify(withTagIds);
}

async function moveMemberOutbox(tx: Transaction): Promise<void> {
  const outbox = tx.table<OutboxEntry | MemberEntry, number>("outbox");

  await outbox
    .where("entity")
    .equals("members")
    .and((entry) => entry.op === "delete")
    .delete();

  await outbox.where("entity").equals("members").modify({ entity: "tags" });

  await outbox
    .where("entity")
    .equals("events")
    .modify((entry) => {
      if (isRecord(entry.payload)) withTagIds(entry.payload);
    });
}

function withTagIds(event: Record<string, unknown>): void {
  event.tagIds = event.memberIds ?? [];

  delete event.memberIds;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
