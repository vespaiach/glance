import "server-only";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { err, ok, type Result } from "@/domain/result";
import type { AccountSettings, LocationRequest, Synced, WeatherLocation } from "@/domain/schemas";
import { finishSetup } from "../auth/account";
import type { Database } from "../db";
import type { ServiceDeps } from "./deps";
import { stamp } from "./rows";

export type SyncedSettings = Synced<AccountSettings> & { accountId: string };

export async function putSettings(
  deps: ServiceDeps,
  accountId: string,
  settingsId: string,
  settings: AccountSettings,
): Promise<Result<SyncedSettings, "not-found">> {
  if (settingsId !== accountId) return err("not-found");

  return ok(await writeSettings(deps, accountId, settings));
}

export async function saveLocation(
  deps: ServiceDeps,
  accountId: string,
  place: WeatherLocation,
): Promise<Result<SyncedSettings, never>> {
  return ok(await writePlace(deps, accountId, place));
}

export function finishLocationStep(
  { db, now }: ServiceDeps,
  accountId: string,
  step: LocationRequest,
): Promise<Result<SyncedSettings | undefined, never>> {
  return db.tx(async (tx) => {
    const saved =
      "place" in step ? await writePlace({ db: tx, now }, accountId, step.place) : undefined;

    await finishSetup({ db: tx, now }, accountId);

    return ok(saved);
  });
}

function writePlace(
  { db, now }: ServiceDeps,
  accountId: string,
  place: WeatherLocation,
): Promise<SyncedSettings> {
  return db.tx(async (tx) => {
    const saved = await savedSettings(tx, accountId);

    return writeSettings({ db: tx, now }, accountId, { ...saved, weatherLocation: place });
  });
}

async function savedSettings(db: Database, accountId: string): Promise<AccountSettings> {
  return (await db.settings.get(accountId)) ?? DEFAULT_SETTINGS;
}

function writeSettings(
  { db, now }: ServiceDeps,
  accountId: string,
  settings: AccountSettings,
): Promise<SyncedSettings> {
  return db.tx(async (tx) => {
    const saved = { ...settings, accountId, ...(await stamp(tx, now())) };

    await tx.settings.save(saved);

    return saved;
  });
}
