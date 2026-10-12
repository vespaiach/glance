import "server-only";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { err, ok, type Result } from "@/domain/result";
import type { AccountSettings, LocationRequest, Synced, WeatherLocation } from "@/domain/schemas";
import { finishSetup } from "../auth/account";
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

  return ok(writeSettings({ db, now }, accountId, settings));
}

export function saveLocation(
  deps: ServiceDeps,
  accountId: string,
  place: WeatherLocation,
): Result<SyncedSettings, never> {
  return ok(writePlace(deps, accountId, place));
}

export function finishLocationStep(
  deps: ServiceDeps,
  accountId: string,
  step: LocationRequest,
): Result<SyncedSettings | undefined, never> {
  return deps.db.transaction(() => {
    const saved = "place" in step ? writePlace(deps, accountId, step.place) : undefined;

    finishSetup(deps, accountId);

    return ok(saved);
  })();
}

function writePlace(deps: ServiceDeps, accountId: string, place: WeatherLocation): SyncedSettings {
  const saved = savedSettings(deps, accountId);

  return writeSettings(deps, accountId, { ...saved, weatherLocation: place });
}

function savedSettings({ db }: ServiceDeps, accountId: string): AccountSettings {
  const row = db.prepare("SELECT json FROM settings WHERE account_id = ?").get(accountId) as
    | { json: string }
    | undefined;

  return row ? (JSON.parse(row.json) as AccountSettings) : DEFAULT_SETTINGS;
}

function writeSettings(
  { db, now }: ServiceDeps,
  accountId: string,
  settings: AccountSettings,
): SyncedSettings {
  return db.transaction(() => {
    const { updatedAt, version } = stamp(db, now());

    db.prepare(
      `INSERT INTO settings (account_id, json, updated_at, version) VALUES (?, ?, ?, ?)
       ON CONFLICT (account_id) DO UPDATE SET json = excluded.json,
         updated_at = excluded.updated_at, version = excluded.version`,
    ).run(accountId, JSON.stringify(settings), updatedAt, version);

    return { ...settings, accountId, updatedAt, version };
  })();
}
