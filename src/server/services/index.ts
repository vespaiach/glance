import "server-only";
import type {
  AccountSettings,
  CalendarEvent,
  LocationRequest,
  Note,
  Photo,
} from "@/domain/schemas";
import { announce, syncBus } from "../bus";
import { getDb } from "../db/db";
import { photoStore } from "../storage";
import { createCensusGeocoder } from "../weather/census";
import { createOpenMeteo } from "../weather/openMeteo";
import type { Coordinates } from "../weather/provider";
import type { ServiceDeps } from "./deps";
import * as displays from "./displays";
import * as events from "./events";
import * as notes from "./notes";
import * as photos from "./photos";
import * as settings from "./settings";
import * as sync from "./sync";
import * as weather from "./weather";

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

export function listDisplays(accountId: string, displayId: string) {
  return displays.listDisplays(deps(), accountId, displayId);
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
export type { WeatherError } from "./weather";

function deps(): ServiceDeps {
  return { db: getDb(), now: () => new Date() };
}

function weatherDeps(): weather.WeatherDeps {
  return { ...deps(), provider: createOpenMeteo(fetch) };
}

function photoDeps(): photos.PhotoDeps {
  return {
    ...deps(),
    store: photoStore(),
    locator: createCensusGeocoder(fetch),
  };
}
