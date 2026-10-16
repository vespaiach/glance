import type { GlanceDb, OutboxEntry } from "../db";
import type { RepoStore } from "./store";

export type WritableEntity = "events" | "notes" | "photos" | "settings";

type ServerFields = { updatedAt: string; version: number; deletedAt?: string };

type NewEntry = Omit<OutboxEntry, "seq">;

const NEW_ROW_VERSION = 0;

async function queued(
  { db, nudge }: RepoStore,
  entity: WritableEntity,
  write: () => Promise<NewEntry | undefined>,
): Promise<void> {
  const entry = await db.transaction("rw", db.table(entity), db.outbox, async () => {
    const next = await write();

    if (next) await db.outbox.add(next as OutboxEntry);

    return next;
  });

  if (entry) nudge();
}

export function putQueued<T extends object>(
  store: RepoStore,
  entity: WritableEntity,
  entityId: string,
  build: (stored: (T & ServerFields) | undefined) => T,
): Promise<void> {
  const table = store.db.table<T & ServerFields>(entity);

  return queued(store, entity, async () => {
    const stored = await table.get(entityId);

    const row = {
      ...build(stored),
      updatedAt: stored?.updatedAt ?? store.now().toISOString(),
      version: stored?.version ?? NEW_ROW_VERSION,
    };

    await table.put(row);

    return { entity, entityId, op: "put", payload: row, attempts: 0 };
  });
}

export function removeQueued(
  store: RepoStore,
  entity: WritableEntity,
  entityId: string,
): Promise<void> {
  const table = store.db.table<ServerFields>(entity);

  return queued(store, entity, async () => {
    const stored = await table.get(entityId);

    if (stored === undefined) return undefined;

    await table.put({ ...stored, deletedAt: store.now().toISOString() });

    return { entity, entityId, op: "delete", attempts: 0 };
  });
}

export async function pendingIds(db: GlanceDb, entity: WritableEntity): Promise<Set<string>> {
  const entries = await db.outbox.where("entity").equals(entity).toArray();

  return new Set(entries.map((entry) => entry.entityId));
}

export function isLive(row: { deletedAt?: string }): boolean {
  return row.deletedAt === undefined;
}
