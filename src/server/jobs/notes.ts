import "server-only";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { noteExpired } from "@/domain/notes";
import type { AccountSettings } from "@/domain/schemas";
import type { Db } from "../db/db";
import type { ServiceDeps } from "../services/deps";
import { lockVersions, stamp } from "../services/rows";

export type Expired = { accountId: string; version: number };

type NoteExpiry = AccountSettings["noteExpiry"];

type LiveNote = { id: string; account_id: string; created_at: string };

export function expireNotes({ db, now }: ServiceDeps): Promise<Expired[]> {
  const at = now();

  return db.tx(async (tx) => {
    await lockVersions(tx);

    const expiries = await noteExpiries(tx);

    const expired = (await liveNotes(tx)).filter((note) =>
      noteExpired(
        { createdAt: note.created_at },
        expiries.get(note.account_id) ?? DEFAULT_SETTINGS.noteExpiry,
        at,
      ),
    );

    const versions = new Map<string, number>();

    for (const note of expired) versions.set(note.account_id, await softDelete(tx, note.id, at));

    return [...versions].map(([accountId, version]) => ({ accountId, version }));
  });
}

function liveNotes(db: Db): Promise<LiveNote[]> {
  return db.all<LiveNote>(
    "SELECT id, account_id, created_at FROM notes WHERE deleted_at IS NULL ORDER BY account_id, id",
  );
}

async function noteExpiries(db: Db): Promise<Map<string, NoteExpiry>> {
  const rows = await db.all<{ id: string; json: AccountSettings | null }>(
    "SELECT accounts.id, settings.json FROM accounts LEFT JOIN settings ON settings.account_id = accounts.id",
  );

  return new Map(rows.map((row) => [row.id, savedExpiry(row.json)]));
}

function savedExpiry(json: AccountSettings | null): NoteExpiry {
  return json === null ? DEFAULT_SETTINGS.noteExpiry : json.noteExpiry;
}

async function softDelete(db: Db, id: string, at: Date): Promise<number> {
  const { updatedAt, version } = await stamp(db, at);

  await db.run("UPDATE notes SET deleted_at = $1, updated_at = $1, version = $2 WHERE id = $3", [
    updatedAt,
    version,
    id,
  ]);

  return version;
}
