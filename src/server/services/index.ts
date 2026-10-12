import "server-only";
import type { AccountSettings, CalendarEvent, Note } from "@/domain/schemas";
import { getDb } from "../db/connection";
import type { ServiceDeps } from "./deps";
import * as events from "./events";
import * as notes from "./notes";
import * as settings from "./settings";

function deps(): ServiceDeps {
  return { db: getDb(), now: () => new Date() };
}

export function putEvent(accountId: string, event: CalendarEvent) {
  return events.putEvent(deps(), accountId, event);
}

export function deleteEvent(accountId: string, id: string) {
  return events.deleteEvent(deps(), accountId, id);
}

export function putNote(accountId: string, note: Note) {
  return notes.putNote(deps(), accountId, note);
}

export function deleteNote(accountId: string, id: string) {
  return notes.deleteNote(deps(), accountId, id);
}

export function putSettings(accountId: string, settingsId: string, saved: AccountSettings) {
  return settings.putSettings(deps(), accountId, settingsId, saved);
}
