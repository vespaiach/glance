import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import type { CalendarEvent } from "@/domain/schemas";
import { parseLocalDate } from "@/domain/time";
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

function startingBetween(db: GlanceDb, from: Date, to: Date): Promise<StoredEvent[]> {
  return db.events
    .where("startAt")
    .between(from.toISOString(), to.toISOString())
    .filter(isLive)
    .toArray();
}

export function useEvent(id: string): StoredEvent | null | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(async () => {
    const row = await db.events.get(id);

    return row && isLive(row) ? row : null;
  }, [db, id]);
}

export function useEventsOnDay(dayKey: string): StoredEvent[] | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(() => {
    const day = parseLocalDate(dayKey);

    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);

    return startingBetween(db, day, next);
  }, [db, dayKey]);
}

export function useEventsInMonth(year: number, month: number): StoredEvent[] | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(
    () => startingBetween(db, new Date(year, month, 1), new Date(year, month + 1, 1)),
    [db, year, month],
  );
}

export function useNextEventAfter(dayKey: string): StoredEvent | null | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(async () => {
    const day = parseLocalDate(dayKey);

    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);

    const first = await db.events
      .where("startAt")
      .aboveOrEqual(next.toISOString())
      .filter(isLive)
      .first();

    return first ?? null;
  }, [db, dayKey]);
}

export function useHasEvents(): boolean | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(async () => (await db.events.filter(isLive).first()) !== undefined, [db]);
}
