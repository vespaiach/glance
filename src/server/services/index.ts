import "server-only";
import path from "node:path";
import type { AccountSettings, CalendarEvent, Note } from "@/domain/schemas";
import { announce, syncBus } from "../bus";
import { getDb } from "../db/connection";
import { env } from "../env";
import { createOpenMeteo } from "../weather/openMeteo";
import type { ServiceDeps } from "./deps";
import * as events from "./events";
import * as notes from "./notes";
import * as photos from "./photos";
import * as settings from "./settings";
import * as sync from "./sync";
import * as weather from "./weather";

function deps(): ServiceDeps {
  return { db: getDb(), now: () => new Date() };
}

function weatherDeps(): weather.WeatherDeps {
  return { ...deps(), provider: createOpenMeteo(fetch) };
}

function photoDeps(): photos.PhotoDeps {
  return { ...deps(), photosDir: path.join(env().DATA_DIR, "photos") };
}

export function putEvent(accountId: string, event: CalendarEvent) {
  return announce(syncBus(), accountId, events.putEvent(deps(), accountId, event));
}

export function deleteEvent(accountId: string, id: string) {
  return announce(syncBus(), accountId, events.deleteEvent(deps(), accountId, id));
}

export function putNote(accountId: string, note: Note) {
  return announce(syncBus(), accountId, notes.putNote(deps(), accountId, note));
}

export function deleteNote(accountId: string, id: string) {
  return announce(syncBus(), accountId, notes.deleteNote(deps(), accountId, id));
}

export function putSettings(accountId: string, settingsId: string, saved: AccountSettings) {
  return announce(syncBus(), accountId, settings.putSettings(deps(), accountId, settingsId, saved));
}

export function pullChanges(accountId: string, since: number | undefined) {
  return sync.pullChanges(deps(), accountId, since);
}

export async function uploadPhoto(accountId: string, upload: photos.PhotoUpload) {
  return announce(syncBus(), accountId, await photos.uploadPhoto(photoDeps(), accountId, upload));
}

export function photoFile(accountId: string, id: string, variant: photos.PhotoVariant) {
  return photos.photoFile(photoDeps(), accountId, id, variant);
}

export function accountWeather(accountId: string) {
  return weather.accountWeather(weatherDeps(), accountId);
}

export function searchPlaces(query: string) {
  return weather.searchPlaces(weatherDeps(), query);
}
export type { WeatherError } from "./weather";
