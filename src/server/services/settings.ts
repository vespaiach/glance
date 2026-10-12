import "server-only";
import { err, ok, type Result } from "@/domain/result";
import type { AccountSettings, Synced } from "@/domain/schemas";
import type { ServiceDeps } from "./deps";
import { stamp } from "./rows";

export type SyncedSettings = Synced<AccountSettings> & { accountId: string };

export function putSettings(
  { db, now }: ServiceDeps,
  accountId: string,
  settingsId: string,
  settings: AccountSettings,
): Result<SyncedSettings, "not-found"> {
  if (settingsId !== accountId) return err("not-found");

  return db.transaction(() => {
    const { updatedAt, version } = stamp(db, now());

    db.prepare(
      `INSERT INTO settings (account_id, json, updated_at, version) VALUES (?, ?, ?, ?)
       ON CONFLICT (account_id) DO UPDATE SET json = excluded.json,
         updated_at = excluded.updated_at, version = excluded.version`,
    ).run(accountId, JSON.stringify(settings), updatedAt, version);

    return ok({ ...settings, accountId, updatedAt, version });
  })();
}
