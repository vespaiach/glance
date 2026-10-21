import "server-only";
import type { AccountRecord, Database } from "../db";

export type Stamp = { updatedAt: string; version: number };

export async function stamp(db: Database, now: Date): Promise<Stamp> {
  return { updatedAt: now.toISOString(), version: await db.versions.next() };
}

export async function accountTimeZone(db: Database, accountId: string): Promise<string> {
  const settings = await db.settings.get(accountId);

  const account = await db.accounts.byId(accountId);

  return settings?.weatherLocation?.timeZone ?? (account as AccountRecord).timeZone;
}
