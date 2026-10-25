import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { allDayStart, eventDayKey } from "@/domain/allDay";
import { recentPlaces, recentTitles } from "@/domain/recent";
import type { CalendarEvent } from "@/domain/schemas";
import { addDays, dayStart } from "@/domain/zone";
import type { GlanceDb, StoredEvent } from "../db";
import { isLive, putQueued, removeQueued } from "./outbox";
import { type RepoStore, useRepoStore } from "./store";

const WEEK = 7;

export type EventRecents = { titles: string[]; places: string[] };

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

export function useEvent(id: string): StoredEvent | null | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(async () => {
    const row = await db.events.get(id);

    return row && isLive(row) ? row : null;
  }, [db, id]);
}

export function useEventsOnDay(dayKey: string, tz: string): StoredEvent[] | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(() => eventsOnDays(db, [dayKey, addDays(dayKey, 1)], tz), [db, dayKey, tz]);
}

export function useEventsInWeek(sunday: string, tz: string): StoredEvent[] | undefined {
  return useEventsBetween(sunday, addDays(sunday, WEEK), tz);
}

export function useEventsBetween(
  first: string,
  end: string,
  tz: string,
): StoredEvent[] | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(() => eventsOnDays(db, [first, end], tz), [db, first, end, tz]);
}

export function useNextEventAfter(dayKey: string, tz: string): StoredEvent | null | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(async () => {
    const next = addDays(dayKey, 1);

    const [allDay] = await firstFrom(db, allDayStart(next), true, 1);

    const [timed] = await firstFrom(db, isoDayStart(next, tz), false, 1);

    return earlierDay(allDay, timed, tz);
  }, [db, dayKey, tz]);
}

export function useEventsAfter(
  dayKey: string,
  tz: string,
  limit: number,
): StoredEvent[] | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(async () => {
    const next = addDays(dayKey, 1);

    const allDay = await firstFrom(db, allDayStart(next), true, limit);

    const timed = await firstFrom(db, isoDayStart(next, tz), false, limit);

    return [...allDay, ...timed];
  }, [db, dayKey, tz, limit]);
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

export function useEventRecents(): EventRecents | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(async () => {
    const events = await db.events.filter(isLive).toArray();

    return { titles: recentTitles(events), places: recentPlaces(events) };
  }, [db]);
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

function firstFrom(
  db: GlanceDb,
  from: string,
  allDay: boolean,
  limit: number,
): Promise<StoredEvent[]> {
  return db.events
    .where("startAt")
    .aboveOrEqual(from)
    .filter(isKind(allDay))
    .limit(limit)
    .toArray();
}

function earlierDay(
  allDay: StoredEvent | undefined,
  timed: StoredEvent | undefined,
  tz: string,
): StoredEvent | null {
  if (!allDay || !timed) return allDay ?? timed ?? null;

  return eventDayKey(timed, tz) < eventDayKey(allDay, tz) ? timed : allDay;
}
