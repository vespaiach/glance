import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
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

function firstOfMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

export function useEventsOnDay(dayKey: string, tz: string): StoredEvent[] | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(
    () => startingBetween(db, dayStart(dayKey, tz), dayStart(addDays(dayKey, 1), tz)),
    [db, dayKey, tz],
  );
}

export function useEventsInMonth(
  year: number,
  month: number,
  tz: string,
): StoredEvent[] | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(
    () =>
      startingBetween(
        db,
        dayStart(firstOfMonth(year, month), tz),
        dayStart(firstOfMonth(year, month + 1), tz),
      ),
    [db, year, month, tz],
  );
}

export function useNextEventAfter(dayKey: string, tz: string): StoredEvent | null | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(async () => {
    const next = dayStart(addDays(dayKey, 1), tz);

    const first = await db.events
      .where("startAt")
      .aboveOrEqual(next.toISOString())
      .filter(isLive)
      .first();

    return first ?? null;
  }, [db, dayKey, tz]);
}

export function useUpcomingEvent(now: Date): StoredEvent | null | undefined {
  const { db } = useRepoStore();

  const after = now.toISOString();

  return useLiveQuery(async () => {
    const first = await db.events.where("startAt").above(after).filter(isLive).first();

    return first ?? null;
  }, [db, after]);
}

export function useHasEvents(): boolean | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(async () => (await db.events.filter(isLive).first()) !== undefined, [db]);
}
