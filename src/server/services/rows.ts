import "server-only";
import type { Tone } from "@/domain/schemas";
import type { Db } from "../db/db";

export type Stamp = { updatedAt: string; version: number };

export type ServerColumns = { updated_at: string; deleted_at: string | null; version: number };

export async function lockVersions(db: Db): Promise<void> {
  await db.run("SELECT version FROM sync_state WHERE id = 1 FOR UPDATE");
}

export async function stamp(db: Db, now: Date): Promise<Stamp> {
  const row = await db.one<{ version: number }>(
    "UPDATE sync_state SET version = version + 1 WHERE id = 1 RETURNING version",
  );

  return { updatedAt: now.toISOString(), version: (row as { version: number }).version };
}

export async function accountTimeZone(db: Db, accountId: string): Promise<string> {
  const row = await db.one<{ time_zone: string }>(
    `SELECT coalesce(settings.json -> 'weatherLocation' ->> 'timeZone', accounts.time_zone) AS time_zone
     FROM accounts LEFT JOIN settings ON settings.account_id = accounts.id
     WHERE accounts.id = $1`,
    [accountId],
  );

  return (row as { time_zone: string }).time_zone;
}

export function serverFields(row: ServerColumns) {
  return {
    updatedAt: row.updated_at,
    version: row.version,
    ...(row.deleted_at === null ? {} : { deletedAt: row.deleted_at }),
  };
}

export function toneFromColumn<T extends Tone>(column: string): T {
  return (/^\d$/.test(column) ? Number(column) : column) as T;
}

export function optional<K extends string>(key: K, value: string | null) {
  return (value === null ? {} : { [key]: value }) as { [P in K]?: string };
}
