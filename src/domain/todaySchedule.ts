import { eventDayKey } from "./allDay";
import { eventStatus } from "./eventStatus";
import type { CalendarEvent } from "./schemas";
import { minutesOfDay } from "./time";
import { dateKey } from "./zone";

export type ScheduleCount = { left: number; total: number };

export type EarlierFold = { done: number; fromHour: number };

type ScheduleEvent = Pick<CalendarEvent, "startAt" | "endAt" | "allDay">;

const FIRST_HOUR = 5;

const LAST_FOLD_HOUR = 20;

const COMING_UP = 5;

export function scheduleCount(
  events: readonly ScheduleEvent[],
  now: Date,
  tz: string,
): ScheduleCount {
  const ended = events.filter((event) => hasEnded(event, now, tz)).length;

  return { left: events.length - ended, total: events.length };
}

export function earlierFold(events: readonly ScheduleEvent[], now: Date, tz: string): EarlierFold {
  const done = events.filter((event) => hasEnded(event, now, tz)).length;

  const hour = Math.floor(minutesOfDay(now, tz) / 60);

  return { done, fromHour: Math.min(LAST_FOLD_HOUR, Math.max(FIRST_HOUR, hour)) };
}

export function comingUp<T extends ScheduleEvent>(
  events: readonly T[],
  now: Date,
  tz: string,
): T[] {
  const today = dateKey(now, tz);

  return events
    .map((event) => ({ event, day: eventDayKey(event, tz) }))
    .filter(({ day }) => day > today)
    .sort((a, b) => a.day.localeCompare(b.day) || byAllDayThenStart(a.event, b.event))
    .slice(0, COMING_UP)
    .map(({ event }) => event);
}

function hasEnded(event: ScheduleEvent, now: Date, tz: string): boolean {
  return eventStatus(event, now, tz) === "past";
}

function byAllDayThenStart(a: ScheduleEvent, b: ScheduleEvent): number {
  return (
    Number(b.allDay === true) - Number(a.allDay === true) || a.startAt.localeCompare(b.startAt)
  );
}
