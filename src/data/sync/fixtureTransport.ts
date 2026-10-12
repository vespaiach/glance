import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { inAmbientHours } from "@/domain/idle";
import { photoTitle, uploadProblem } from "@/domain/photoUpload";
import { err, ok, type Result } from "@/domain/result";
import type { AccountSettings, Weather, WeatherLocation } from "@/domain/schemas";
import { localDateKey } from "@/domain/time";
import {
  FIXTURE_ACCOUNT,
  FIXTURE_AMBIENT_WEATHER,
  FIXTURE_EVENTS,
  FIXTURE_NOTES,
  FIXTURE_NOW,
  FIXTURE_PHOTOS,
  FIXTURE_PLACES,
  FIXTURE_SETTINGS,
  FIXTURE_WEATHER,
} from "@/fixtures/data";
import type { FixtureParams } from "@/fixtures/params";
import { CURSOR_KEY, type GlanceDb, type OutboxEntry, type StoredPhoto } from "../db";
import type { AuthStatus, Change, Transport, TransportError, UploadError } from "./transport";

export const FIXTURE_CURSOR = "fixture";

export const SIGN_IN_DELAY_MS = 1_400;

export const PLACE_SEARCH_DELAY_MS = 1_200;

export const UPLOAD_TICK_MS = 400;

export const UPLOAD_STEP_PERCENT = 8;

const SEED_VERSION = 1;

type Seed = {
  settings: AccountSettings;
  withRows: boolean;
  weather?: Weather;
};

type Options = { db: GlanceDb; params: FixtureParams; now: () => Date };

type Stamp = () => { updatedAt: string; version: number };

const seeded = <T>(row: T) => ({
  ...row,
  updatedAt: FIXTURE_NOW.toISOString(),
  version: SEED_VERSION,
});

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const never = <T>() => new Promise<T>(() => {});

function unlocated({ weatherLocation: _, ...settings }: AccountSettings): AccountSettings {
  return settings;
}

function onPhoto(settings: AccountSettings): AccountSettings {
  return { ...settings, background: { ...settings.background, mode: "photo" } };
}

function fixtureWeather(params: FixtureParams): Weather {
  const evening = params.now && inAmbientHours(FIXTURE_SETTINGS.ambientHours, params.now);

  return evening ? FIXTURE_AMBIENT_WEATHER : FIXTURE_WEATHER;
}

function fixtureSeed(params: FixtureParams): Seed | undefined {
  if (params.net === "loading") return undefined;

  if (params.empty) return { settings: DEFAULT_SETTINGS, withRows: false };

  const settings = params.bg === "photo" ? onPhoto(FIXTURE_SETTINGS) : FIXTURE_SETTINGS;

  if (params.wx) return { settings: unlocated(settings), withRows: true };

  const weather = params.net === "wxerror" ? undefined : fixtureWeather(params);

  return { settings, withRows: true, ...(weather && { weather }) };
}

async function writeSeed(db: GlanceDb, seed: Seed): Promise<void> {
  const accountId = FIXTURE_ACCOUNT.id;

  if (seed.withRows) {
    await db.events.bulkPut(FIXTURE_EVENTS.map(seeded));
    await db.notes.bulkPut(FIXTURE_NOTES.map(seeded));
    await db.photos.bulkPut(FIXTURE_PHOTOS.map(seeded));
  }

  await db.settings.put({ ...seeded(seed.settings), accountId });

  if (seed.weather) await db.weather.put({ ...seed.weather, accountId });

  await db.meta.put({ key: CURSOR_KEY, value: FIXTURE_CURSOR });
}

export async function seedFixtureDb(db: GlanceDb, params: FixtureParams): Promise<void> {
  const seed = fixtureSeed(params);

  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));

    if (seed) await writeSeed(db, seed);
  });
}

function isOffline(params: FixtureParams): boolean {
  return params.net === "offline" || params.signin === "offline" || params.upload === "offline";
}

function onlineOnly(offline: boolean) {
  return async <T>(answer: () => Promise<Result<T, TransportError>>) =>
    offline ? err<TransportError>("network") : answer();
}

function authStatus(params: FixtureParams): AuthStatus {
  if (params.signin === "phone") return { state: "needs-name-elsewhere" };

  if (params.signin === "expired") return { state: "expired" };

  if (params.signin !== "done") return { state: "waiting" };

  return { state: "signed-in", account: FIXTURE_ACCOUNT, returning: params.acct === "returning" };
}

function unlistedPlace(query: string): WeatherLocation[] {
  const [name = "", ...region] = query.split(",");

  return [{ name: name.trim(), region: region.join(",").trim(), lat: 0, lon: 0 }];
}

function matchPlaces(query: string): WeatherLocation[] {
  const key = query.trim().toLowerCase().replace(/\s+/g, " ");

  const known = FIXTURE_PLACES[key];

  if (known) return [...known];

  return /^\d{5}$/.test(key) || key.includes(",") ? unlistedPlace(query.trim()) : [];
}

async function acceptPush(db: GlanceDb, entry: OutboxEntry, stamp: Stamp, now: () => Date) {
  if (entry.op === "put") {
    return ok({
      entity: entry.entity,
      row: { ...(entry.payload as object), ...stamp() },
    } as Change);
  }

  const row = await db.table(entry.entity).get(entry.entityId);

  if (row === undefined) return err<TransportError>("invalid");

  const tombstone = { ...row, deletedAt: now().toISOString(), ...stamp() };

  return ok({ entity: entry.entity, row: tombstone } as Change);
}

async function reportProgress(onProgress: (percent: number) => void): Promise<void> {
  for (let percent = 0; percent < 100; ) {
    await wait(UPLOAD_TICK_MS);

    percent = Math.min(100, percent + UPLOAD_STEP_PERCENT);

    onProgress(percent);
  }
}

export function createFixtureAuth(params: FixtureParams): Transport["auth"] {
  const online = onlineOnly(isOffline(params));

  return {
    link: () =>
      online(async () => {
        await wait(SIGN_IN_DELAY_MS);

        return ok(undefined);
      }),
    status: () => online(async () => ok(authStatus(params))),
    name: (name) => online(async () => ok({ ...FIXTURE_ACCOUNT, name: name.trim() })),
    signout: () => online(async () => ok(undefined)),
  };
}

export function createFixtureTransport({ db, params, now }: Options): Transport {
  const offline = isOffline(params);

  const loading = params.net === "loading";

  let version = SEED_VERSION;

  const stamp: Stamp = () => {
    version += 1;

    return { updatedAt: now().toISOString(), version };
  };

  const online = onlineOnly(offline);

  const uploaded = (file: File): StoredPhoto => ({
    id: crypto.randomUUID(),
    title: photoTitle(file.name),
    takenOn: localDateKey(now()),
    createdAt: now().toISOString(),
    ...stamp(),
  });

  return {
    push: (entry) => online(() => acceptPush(db, entry, stamp, now)),
    pull: () =>
      online(async () => (loading ? never() : ok({ cursor: FIXTURE_CURSOR, changes: [] }))),
    weather: () =>
      online(async () => {
        if (loading) return never();

        return params.net === "wxerror" ? err("server") : ok(fixtureWeather(params));
      }),
    places: (query) =>
      online(async () => {
        await wait(PLACE_SEARCH_DELAY_MS);

        return ok(matchPlaces(query));
      }),
    auth: createFixtureAuth(params),
    upload: async (file, onProgress): Promise<Result<StoredPhoto, UploadError>> => {
      const problem = uploadProblem(file);

      if (problem) return err(problem);

      if (offline) return err("network");

      await reportProgress(onProgress);

      return ok(uploaded(file));
    },
  };
}
