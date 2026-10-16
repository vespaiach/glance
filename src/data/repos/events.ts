import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { allDayStart, eventDayKey } from "@/domain/allDay";
import type { CalendarEvent } from "@/domain/schemas";
import { addDays, dayStart } from "@/domain/zone";
import type { GlanceDb, StoredEvent } from "../db";
import { isLive, putQueued, removeQueued } from "./outbox";
import { type RepoStore, useRepoStore } from "./store";

export interface EventsRepo {
  put(event: CalendarEvent): Promise<void>;
  remove(id: string): Promise<void>;
}

export function createEventsRepo(store: RepoStore): EventsRepo {
  return {
    put: (event) => putQueued<CalendarEvent>(store, "events", event.id, () => event),
    remove: (id) => removeQueued(store, "events", id),
  };
}

export function useEventsRepo(): EventsRepo {
  const store = useRepoStore();

  return useMemo(() => createEventsRepo(store), [store]);
}

function isKind(allDay: boolean) {
  return (row: StoredEvent) => isLive(row) && (row.allDay === true) === allDay;
}

function startingBetween(
  db: GlanceDb,
  [from, to]: readonly [string, string],
  allDay: boolean,
): Promise<StoredEvent[]> {
  return db.events.where("startAt").between(from, to).filter(isKind(allDay)).toArray();
}

async function eventsOnDays(
  db: GlanceDb,
  [first, end]: readonly [string, string],
  tz: string,
): Promise<StoredEvent[]> {
  const allDay = await startingBetween(db, [allDayStart(first), allDayStart(end)], true);

  const timed = await startingBetween(db, [isoDayStart(first, tz), isoDayStart(end, tz)], false);

  return [...allDay, ...timed];
}

function isoDayStart(key: string, tz: string): string {
  return dayStart(key, tz).toISOString();
}

function firstFrom(db: GlanceDb, from: string, allDay: boolean): Promise<StoredEvent | undefined> {
  return db.events.where("startAt").aboveOrEqual(from).filter(isKind(allDay)).first();
}

function earlierDay(
  allDay: StoredEvent | undefined,
  timed: StoredEvent | undefined,
  tz: string,
): StoredEvent | null {
  if (!allDay || !timed) return allDay ?? timed ?? null;

  return eventDayKey(timed, tz) < eventDayKey(allDay, tz) ? timed : allDay;
}

export function useEvent(id: string): StoredEvent | null | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(async () => {
    const row = await db.events.get(id);

    return row && isLive(row) ? row : null;
  }, [db, id]);
}

function firstOfMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

export function useEventsOnDay(dayKey: string, tz: string): StoredEvent[] | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(() => eventsOnDays(db, [dayKey, addDays(dayKey, 1)], tz), [db, dayKey, tz]);
}

export function useEventsInMonth(
  year: number,
  month: number,
  tz: string,
): StoredEvent[] | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(
    () => eventsOnDays(db, [firstOfMonth(year, month), firstOfMonth(year, month + 1)], tz),
    [db, year, month, tz],
  );
}

export function useNextEventAfter(dayKey: string, tz: string): StoredEvent | null | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(async () => {
    const next = addDays(dayKey, 1);

    const allDay = await firstFrom(db, allDayStart(next), true);

    const timed = await firstFrom(db, isoDayStart(next, tz), false);

    return earlierDay(allDay, timed, tz);
  }, [db, dayKey, tz]);
}

export function useUpcomingEvent(now: Date): StoredEvent | null | undefined {
  const { db } = useRepoStore();

  const after = now.toISOString();

  return useLiveQuery(async () => {
    const first = await db.events.where("startAt").above(after).filter(isKind(false)).first();

    return first ?? null;
  }, [db, after]);
}

export function useHasEvents(): boolean | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(async () => (await db.events.filter(isLive).first()) !== undefined, [db]);
}
