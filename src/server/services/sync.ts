import "server-only";
import type { ServiceDeps } from "./deps";
import type { SyncedEvent } from "./events";
import type { SyncedNote } from "./notes";
import type { SyncedPhoto } from "./photos";
import type { SyncedSettings } from "./settings";
import type { SyncedTag } from "./tags";

export type SyncChange =
  | { entity: "tags"; row: SyncedTag }
  | { entity: "events"; row: SyncedEvent }
  | { entity: "notes"; row: SyncedNote }
  | { entity: "photos"; row: SyncedPhoto }
  | { entity: "settings"; row: SyncedSettings };

export type SyncPull = { cursor: string; changes: SyncChange[] };

export function pullChanges(
  { db }: ServiceDeps,
  accountId: string,
  since: number | undefined,
): Promise<SyncPull> {
  return db.tx(async (tx): Promise<SyncPull> => {
    const after = since ?? 0;

    const tags = await tx.tags.changedSince(accountId, after);

    const events = await tx.events.changedSince(accountId, after);

    const notes = await tx.notes.changedSince(accountId, after);

    const photos = await tx.photos.changedSince(accountId, after);

    const settings = await tx.settings.changedSince(accountId, after);

    const changes = [
      ...tags.map((row): SyncChange => ({ entity: "tags", row })),
      ...events.map((row): SyncChange => ({ entity: "events", row })),
      ...notes.map((row): SyncChange => ({ entity: "notes", row })),
      ...photos.map((row): SyncChange => ({ entity: "photos", row })),
      ...settings.map((row): SyncChange => ({ entity: "settings", row })),
    ];

    return { cursor: String(await tx.versions.current()), changes: byVersion(changes) };
  });
}

function byVersion(changes: SyncChange[]): SyncChange[] {
  return changes.sort((a, b) => a.row.version - b.row.version);
}
