import "server-only";
import type { AccountSettings, CalendarEvent, Note } from "@/domain/schemas";
import { announce, syncBus } from "../bus";
import { getDb } from "../db/connection";
import type { ServiceDeps } from "./deps";
import * as events from "./events";
import * as notes from "./notes";
import * as settings from "./settings";
import * as sync from "./sync";

function deps(): ServiceDeps {
  return { db: getDb(), now: () => new Date() };
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
