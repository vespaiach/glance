import { type EventStatus, eventStatus } from "./eventStatus";
import type { CalendarEvent } from "./schemas";

type ScheduleEvent = Pick<CalendarEvent, "startAt" | "endAt" | "allDay">;

export type TodaySchedule<T extends ScheduleEvent> = {
  allDay: T[];
  rows: T[];
  hidden: { earlier: number; later: number };
};

type Groups<T> = Record<Exclude<EventStatus, "allDay">, T[]>;

const byStart = (a: ScheduleEvent, b: ScheduleEvent) => a.startAt.localeCompare(b.startAt);

function groupByStatus<T extends ScheduleEvent>(
  timed: readonly T[],
  status: (event: T) => EventStatus,
): Groups<T> {
  return {
    past: timed.filter((event) => status(event) === "past"),
    now: timed.filter((event) => status(event) === "now"),
    upcoming: timed.filter((event) => status(event) === "upcoming"),
  };
}

function keptRows<T>({ past, now, upcoming }: Groups<T>, places: number): Set<T> {
  const always = [...now, ...upcoming.slice(0, 1)];

  const byPriority = [...always, ...upcoming.slice(1), ...[...past].reverse()];

  return new Set(byPriority.slice(0, Math.max(places, always.length)));
}

export function todaySchedule<T extends ScheduleEvent>(
  events: readonly T[],
  now: Date,
  tz: string,
  capacity: number,
): TodaySchedule<T> {
  const allDay = events.filter((event) => event.allDay);

  const timed = events.filter((event) => !event.allDay).sort(byStart);

  if (timed.length <= capacity) return { allDay, rows: timed, hidden: { earlier: 0, later: 0 } };

  const groups = groupByStatus(timed, (event) => eventStatus(event, now, tz));

  const kept = keptRows(groups, capacity - 1);

  const hiddenIn = (rows: T[]) => rows.filter((event) => !kept.has(event)).length;

  return {
    allDay,
    rows: timed.filter((event) => kept.has(event)),
    hidden: { earlier: hiddenIn(groups.past), later: hiddenIn(groups.upcoming) },
  };
}
