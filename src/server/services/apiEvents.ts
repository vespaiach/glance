import "server-only";
import * as v from "valibot";
import { allDayStart, eventDayKey } from "@/domain/allDay";
import { uuidv7 } from "@/domain/id";
import { err, ok, type Result } from "@/domain/result";
import {
  type ApiEvent,
  type ApiEventField,
  type ApiEventInput,
  type ApiEventPatch,
  type ApiRange,
  type CalendarEvent,
  IsoDateSchema,
} from "@/domain/schemas";
import { dateKey } from "@/domain/zone";
import type { Database, StoredEvent, StoredTag } from "../db";
import type { ServiceDeps } from "./deps";
import { deleteEvent, putEvent } from "./events";
import { accountTimeZone } from "./rows";

export type SavedApiEvent = { event: ApiEvent; version: number };

export type ApiEventError = "not-found" | ApiEventField;

type Span = Pick<CalendarEvent, "startAt" | "endAt" | "allDay">;

type Who = Pick<CalendarEvent, "everyone" | "tagIds">;

type Kept = Pick<CalendarEvent, "id" | "notify">;

export async function listApiEvents(
  { db }: ServiceDeps,
  accountId: string,
  range: ApiRange,
): Promise<ApiEvent[]> {
  const events = (await db.events.changedSince(accountId, 0)).filter(isLive);

  const tz = await accountTimeZone(db, accountId);

  const tags = await liveTags(db, accountId);

  return events
    .filter((event) => isInRange(event, eventDayKey(event, tz), range))
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .map((event) => toApiEvent(event, tags));
}

export async function readApiEvent(
  { db }: ServiceDeps,
  accountId: string,
  id: string,
): Promise<Result<ApiEvent, "not-found">> {
  const event = await ownedLive(db, accountId, id);

  if (!event) return err("not-found");

  return ok(toApiEvent(event, await liveTags(db, accountId)));
}

export async function createApiEvent(
  deps: ServiceDeps,
  accountId: string,
  input: ApiEventInput,
): Promise<Result<SavedApiEvent, ApiEventError>> {
  const built = await toCalendarEvent(deps.db, accountId, input, {
    id: uuidv7(deps.now()),
    notify: true,
  });

  if (!built.ok) return built;

  return saved(deps, accountId, built.value);
}

export async function changeApiEvent(
  deps: ServiceDeps,
  accountId: string,
  id: string,
  patch: ApiEventPatch,
): Promise<Result<SavedApiEvent, ApiEventError>> {
  const current = await ownedLive(deps.db, accountId, id);

  if (!current) return err("not-found");

  const { id: _, ...fields } = toApiEvent(current, await liveTags(deps.db, accountId));

  const built = await toCalendarEvent(deps.db, accountId, { ...fields, ...patch }, current);

  if (!built.ok) return built;

  return saved(deps, accountId, built.value);
}

export async function deleteApiEvent(
  deps: ServiceDeps,
  accountId: string,
  id: string,
): Promise<Result<{ version: number }, "not-found">> {
  if (!(await ownedLive(deps.db, accountId, id))) return err("not-found");

  const deleted = await deleteEvent(deps, accountId, id);

  return deleted.ok ? ok({ version: deleted.value.version }) : deleted;
}

async function saved(
  deps: ServiceDeps,
  accountId: string,
  event: CalendarEvent,
): Promise<Result<SavedApiEvent, ApiEventError>> {
  const put = await putEvent(deps, accountId, event);

  if (!put.ok) return put;

  const tags = await liveTags(deps.db, accountId);

  return ok({ event: toApiEvent(put.value, tags), version: put.value.version });
}

async function toCalendarEvent(
  db: Database,
  accountId: string,
  input: ApiEventInput,
  kept: Kept,
): Promise<Result<CalendarEvent, ApiEventField>> {
  const span = toSpan(input, await accountTimeZone(db, accountId));

  if (!span.ok) return span;

  const who = toWho(input.who, await liveTags(db, accountId));

  if (!who.ok) return who;

  return ok({
    id: kept.id,
    title: input.title,
    ...span.value,
    ...who.value,
    ...(input.place ? { location: input.place } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    ...(kept.notify === undefined ? {} : { notify: kept.notify }),
    ...(input.repeat ? { repeat: input.repeat } : {}),
    ...(input.exdates && input.exdates.length > 0 ? { exdates: input.exdates } : {}),
  });
}

function toSpan(input: ApiEventInput, tz: string): Result<Span, ApiEventField> {
  const isDate = v.is(IsoDateSchema, input.start);

  if (input.allDay) return allDaySpan(input, isDate);

  if (isDate) return err("start");

  const startAt = new Date(input.start).toISOString();

  if (!input.end) return ok({ startAt });

  const endAt = new Date(input.end).toISOString();

  if (endAt <= startAt || !isSameDay(startAt, endAt, tz)) return err("end");

  return ok({ startAt, endAt });
}

function allDaySpan(input: ApiEventInput, isDate: boolean): Result<Span, ApiEventField> {
  if (!isDate) return err("start");

  if (input.end) return err("end");

  return ok({ startAt: allDayStart(input.start), allDay: true });
}

function toWho(
  names: readonly string[] | null | undefined,
  tags: readonly StoredTag[],
): Result<Who, ApiEventField> {
  if (names === undefined || names === null) return ok({ everyone: true, tagIds: [] });

  const wanted = new Set(names.map(nameKey));

  const picked = tags.filter((tag) => wanted.has(nameKey(tag.name)));

  if (picked.length < wanted.size) return err("who");

  return ok({ everyone: false, tagIds: picked.map((tag) => tag.id) });
}

function toApiEvent(event: StoredEvent, tags: readonly StoredTag[]): ApiEvent {
  return {
    id: event.id,
    title: event.title,
    start: event.allDay ? event.startAt.slice(0, "YYYY-MM-DD".length) : event.startAt,
    ...(event.endAt ? { end: event.endAt } : {}),
    ...(event.allDay ? { allDay: true } : {}),
    ...(event.everyone ? {} : { who: whoNames(event.tagIds, tags) }),
    ...(event.location ? { place: event.location } : {}),
    ...(event.notes ? { notes: event.notes } : {}),
    ...(event.repeat ? { repeat: event.repeat } : {}),
    ...(event.exdates ? { exdates: event.exdates } : {}),
  };
}

function whoNames(tagIds: readonly string[], tags: readonly StoredTag[]): string[] {
  return tags.filter((tag) => tagIds.includes(tag.id)).map((tag) => tag.name);
}

function isInRange(event: StoredEvent, day: string, { from, to }: ApiRange): boolean {
  if (to !== undefined && day > to) return false;

  return event.repeat !== undefined || from === undefined || day >= from;
}

function isSameDay(startAt: string, endAt: string, tz: string): boolean {
  return dateKey(new Date(startAt), tz) === dateKey(new Date(endAt), tz);
}

async function ownedLive(
  db: Database,
  accountId: string,
  id: string,
): Promise<StoredEvent | undefined> {
  const found = await db.events.find(id);

  if (found?.accountId !== accountId || found.value.deletedAt) return undefined;

  return found.value;
}

async function liveTags(db: Database, accountId: string): Promise<StoredTag[]> {
  const tags = (await db.tags.changedSince(accountId, 0)).filter(isLive);

  return tags.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function isLive(row: { deletedAt?: string }): boolean {
  return row.deletedAt === undefined;
}

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}
