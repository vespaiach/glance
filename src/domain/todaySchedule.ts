import { eventDayKey } from "./allDay";
import { eventStatus } from "./eventStatus";
import type { CalendarEvent } from "./schemas";
import { minutesOfDay } from "./time";
import { dateKey } from "./zone";

export type ScheduleCount = { left: number; total: number };

export type EarlierFold = { done: number; fromHour: number; toHour: number };

type ScheduleEvent = Pick<CalendarEvent, "startAt" | "endAt" | "allDay">;

const FIRST_HOUR = 5;

const LAST_FOLD_HOUR = 20;

const DAY_END_HOUR = 21;

const MIN_HOURS = 4;

const COMING_UP = 5;

export function scheduleCount(
  events: readonly ScheduleEvent[],
  now: Date,
  tz: string,
): ScheduleCount {
  const ended = events.filter((event) => hasEnded(event, now, tz)).length;

  return { left: events.length - ended, total: events.length };
}

export function earlierFold(
  events: readonly ScheduleEvent[],
  now: Date,
  tz: string,
  open = false,
): EarlierFold {
  const done = events.filter((event) => hasEnded(event, now, tz)).length;

  const fromHour = open ? FIRST_HOUR : foldHour(now, tz);

  return { done, fromHour, toHour: Math.min(24, Math.max(DAY_END_HOUR, fromHour + MIN_HOURS)) };
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

function foldHour(now: Date, tz: string): number {
  const hour = Math.floor(minutesOfDay(now, tz) / 60);

  return Math.min(LAST_FOLD_HOUR, Math.max(FIRST_HOUR, hour));
}

function hasEnded(event: ScheduleEvent, now: Date, tz: string): boolean {
  return eventStatus(event, now, tz) === "past";
}

function byAllDayThenStart(a: ScheduleEvent, b: ScheduleEvent): number {
  return (
    Number(b.allDay === true) - Number(a.allDay === true) || a.startAt.localeCompare(b.startAt)
  );
}
