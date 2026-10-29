import "server-only";
import { err, ok, type Result } from "@/domain/result";
import type {
  AccountSettings,
  CalendarEvent,
  ClientError,
  LocationRequest,
  Note,
  Photo,
  PushSubscription,
  Tag,
} from "@/domain/schemas";
import { GB } from "@/domain/storage";
import { createRateLimiter, type RateLimiter } from "../auth/rateLimit";
import { announce, syncBus } from "../bus";
import { database } from "../db";
import { env } from "../env";
import { photoStore } from "../storage";
import { createCensusGeocoder } from "../weather/census";
import { createOpenMeteo } from "../weather/openMeteo";
import type { Coordinates } from "../weather/provider";
import * as clientErrors from "./clientErrors";
import type { ServiceDeps } from "./deps";
import * as displays from "./displays";
import * as events from "./events";
import * as importCommits from "./imports/commit";
import * as imports from "./imports/stage";
import * as notes from "./notes";
import * as photos from "./photos";
import * as push from "./push";
import * as settings from "./settings";
import * as sync from "./sync";
import * as tags from "./tags";
import * as weather from "./weather";

const CLIENT_ERROR_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };

const shared = globalThis as typeof globalThis & { glanceClientErrors?: RateLimiter };

export async function putTag(accountId: string, tag: Tag) {
  return announce(syncBus(), accountId, await tags.putTag(deps(), accountId, tag));
}

export async function removeTag(accountId: string, id: string) {
  return announce(syncBus(), accountId, await tags.removeTag(deps(), accountId, id));
}

export async function putEvent(accountId: string, event: CalendarEvent) {
  return announce(syncBus(), accountId, await events.putEvent(deps(), accountId, event));
}

export async function deleteEvent(accountId: string, id: string) {
  return announce(syncBus(), accountId, await events.deleteEvent(deps(), accountId, id));
}

export async function putNote(accountId: string, note: Note) {
  return announce(syncBus(), accountId, await notes.putNote(deps(), accountId, note));
}

export async function deleteNote(accountId: string, id: string) {
  return announce(syncBus(), accountId, await notes.deleteNote(deps(), accountId, id));
}

export async function putSettings(accountId: string, settingsId: string, saved: AccountSettings) {
  return announce(
    syncBus(),
    accountId,
    await settings.putSettings(deps(), accountId, settingsId, saved),
  );
}

export async function finishLocationStep(accountId: string, step: LocationRequest) {
  const saved = await settings.finishLocationStep(deps(), accountId, step);

  if (saved.ok && saved.value) syncBus().publish(accountId, saved.value.version);

  return saved;
}

export function pullChanges(accountId: string, since: number | undefined) {
  return sync.pullChanges(deps(), accountId, since);
}

export async function uploadPhoto(accountId: string, upload: photos.PhotoUpload) {
  return announce(syncBus(), accountId, await photos.uploadPhoto(photoDeps(), accountId, upload));
}

export async function putPhoto(accountId: string, photo: Photo) {
  return announce(syncBus(), accountId, await photos.putPhoto(deps(), accountId, photo));
}

export async function deletePhoto(accountId: string, id: string) {
  return announce(syncBus(), accountId, await photos.deletePhoto(photoDeps(), accountId, id));
}

export function photoFile(accountId: string, id: string, variant: photos.PhotoVariant) {
  return photos.photoFile(photoDeps(), accountId, id, variant);
}

export function photoUsage(accountId: string) {
  return photos.photoUsage(photoDeps(), accountId);
}

export function stageImport(accountId: string, displayId: string, upload: imports.IcsUpload) {
  return imports.stageImport(deps(), accountId, displayId, upload);
}

export function stagedImport(accountId: string, displayId: string) {
  return imports.stagedImport(deps(), accountId, displayId);
}

export async function commitImport(accountId: string, id: string, who: string) {
  return announce(
    syncBus(),
    accountId,
    await importCommits.commitImport(deps(), accountId, id, who),
  );
}

export async function undoImport(accountId: string, id: string) {
  return announce(syncBus(), accountId, await importCommits.undoImport(deps(), accountId, id));
}

export function lastImport(accountId: string) {
  return importCommits.lastImport(deps(), accountId);
}

export function listDisplays(accountId: string, displayId: string) {
  return displays.listDisplays(deps(), accountId, displayId);
}

export function pushKey(): Result<string, "push-off"> {
  const config = env().push;

  return config ? ok(config.publicKey) : err("push-off");
}

export function subscribePush(
  accountId: string,
  displayId: string,
  subscription: PushSubscription,
) {
  return push.subscribePush(deps(), accountId, displayId, subscription);
}

export function unsubscribePush(accountId: string, displayId: string) {
  return push.unsubscribePush(deps(), accountId, displayId);
}

export function accountWeather(accountId: string) {
  return weather.accountWeather(weatherDeps(), accountId);
}

export function searchPlaces(query: string) {
  return weather.searchPlaces(weatherDeps(), query);
}
export function locatePlace(position: Coordinates) {
  return weather.locatePlace(
    { provider: createOpenMeteo(fetch), locator: createCensusGeocoder(fetch) },
    position,
  );
}
export function logClientError(sender: clientErrors.ClientErrorSender, report: ClientError) {
  shared.glanceClientErrors ??= createRateLimiter(CLIENT_ERROR_LIMIT);

  return clientErrors.logClientError(
    { limiter: shared.glanceClientErrors, now: () => new Date() },
    sender,
    report,
  );
}

export type { WeatherError } from "./weather";

function deps(): ServiceDeps {
  return { db: database(), now: () => new Date() };
}

function weatherDeps(): weather.WeatherDeps {
  return { ...deps(), provider: createOpenMeteo(fetch) };
}

function photoDeps(): photos.PhotoDeps {
  return {
    ...deps(),
    store: photoStore(),
    locator: createCensusGeocoder(fetch),
    storageLimit: env().PHOTO_STORAGE_GB * GB,
  };
}
