import "server-only";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { noteExpired } from "@/domain/notes";
import type { AccountSettings } from "@/domain/schemas";
import type { Database, Owned, StoredNote } from "../db";
import type { ServiceDeps } from "../services/deps";
import { stamp } from "../services/rows";

export type Expired = { accountId: string; version: number };

type NoteExpiry = AccountSettings["noteExpiry"];

export function expireNotes({ db, now }: ServiceDeps): Promise<Expired[]> {
  const at = now();

  return db.tx(async (tx) => {
    const expiries = await noteExpiries(tx);

    const expired = (await tx.notes.live()).filter(({ accountId, value }) =>
      noteExpired(
        { createdAt: value.createdAt },
        expiries.get(accountId) ?? DEFAULT_SETTINGS.noteExpiry,
        at,
      ),
    );

    const versions = new Map<string, number>();

    for (const note of expired) versions.set(note.accountId, await softDelete(tx, note, at));

    return [...versions].map(([accountId, version]) => ({ accountId, version }));
  });
}

async function noteExpiries(db: Database): Promise<Map<string, NoteExpiry>> {
  const saved = await db.settings.all();

  return new Map(saved.map((settings) => [settings.accountId, settings.noteExpiry]));
}

async function softDelete(
  db: Database,
  { accountId, value }: Owned<StoredNote>,
  at: Date,
): Promise<number> {
  const { updatedAt, version } = await stamp(db, at);

  await db.notes.save(accountId, { ...value, deletedAt: updatedAt, updatedAt, version });

  return version;
}
