import type { GlanceDb, OutboxEntry } from "../db";
import type { RepoStore } from "./store";

export type WritableEntity = "members" | "events" | "notes" | "photos" | "settings";

export type NewEntry = Omit<OutboxEntry, "seq">;

type ServerFields = { updatedAt: string; version: number; deletedAt?: string };

const NEW_ROW_VERSION = 0;

export function putQueued<T extends object>(
  store: RepoStore,
  entity: WritableEntity,
  entityId: string,
  build: (stored: (T & ServerFields) | undefined) => T,
): Promise<void> {
  return queued(store, [entity], async () => [await putRow(store, entity, entityId, build)]);
}

export function removeQueued(
  store: RepoStore,
  entity: WritableEntity,
  entityId: string,
): Promise<void> {
  return queued(store, [entity], async () => [await removeRow(store, entity, entityId)]);
}

export async function putRow<T extends object>(
  store: RepoStore,
  entity: WritableEntity,
  entityId: string,
  build: (stored: (T & ServerFields) | undefined) => T,
): Promise<NewEntry> {
  const table = store.db.table<T & ServerFields>(entity);

  const stored = await table.get(entityId);

  const row = {
    ...build(stored),
    updatedAt: stored?.updatedAt ?? store.now().toISOString(),
    version: stored?.version ?? NEW_ROW_VERSION,
  };

  await table.put(row);

  return { entity, entityId, op: "put", payload: row, attempts: 0 };
}

export async function removeRow(
  store: RepoStore,
  entity: WritableEntity,
  entityId: string,
): Promise<NewEntry | undefined> {
  const table = store.db.table<ServerFields>(entity);

  const stored = await table.get(entityId);

  if (stored === undefined) return undefined;

  await table.put({ ...stored, deletedAt: store.now().toISOString() });

  return { entity, entityId, op: "delete", attempts: 0 };
}

export async function queued(
  { db, nudge }: RepoStore,
  entities: readonly WritableEntity[],
  write: () => Promise<(NewEntry | undefined)[]>,
): Promise<void> {
  const tables = entities.map((entity) => db.table(entity));

  const added = await db.transaction("rw", [...tables, db.outbox], async () => {
    const entries = (await write()).filter((entry) => entry !== undefined);

    for (const entry of entries) await db.outbox.add(entry as OutboxEntry);

    return entries.length;
  });

  if (added > 0) nudge();
}

export async function pendingIds(db: GlanceDb, entity: WritableEntity): Promise<Set<string>> {
  const entries = await db.outbox.where("entity").equals(entity).toArray();

  return new Set(entries.map((entry) => entry.entityId));
}

export function isLive(row: { deletedAt?: string }): boolean {
  return row.deletedAt === undefined;
}
