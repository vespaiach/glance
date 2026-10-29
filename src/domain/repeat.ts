import { allDayStart, eventDayKey } from "./allDay";
import type { CalendarEvent } from "./schemas";
import { atMinute, minutesOfDay } from "./time";
import { addDays, parseDateKey } from "./zone";

type SeriesEvent = Pick<CalendarEvent, "startAt" | "endAt" | "allDay" | "repeat" | "exdates">;

const WEEK = 7;

const WEEK_MS = WEEK * 86_400_000;

export function occurrencesBetween<T extends SeriesEvent>(
  events: readonly T[],
  first: string,
  end: string,
  tz: string,
): T[] {
  return events.flatMap((event) => occurrences(event, first, end, tz));
}

export function nextOccurrence<T extends SeriesEvent>(
  event: T,
  from: string,
  tz: string,
): T | undefined {
  const day = eventDayKey(event, tz);

  if (event.repeat !== "weekly") return day >= from ? event : undefined;

  const first = day > from ? day : from;

  const weeks = (event.exdates?.length ?? 0) + 1;

  return occurrences(event, first, addDays(first, weeks * WEEK), tz)[0];
}

function occurrences<T extends SeriesEvent>(event: T, first: string, end: string, tz: string): T[] {
  const day = eventDayKey(event, tz);

  if (event.repeat !== "weekly") return day >= first && day < end ? [event] : [];

  const shown: T[] = [];

  for (let week = firstWeek(day, first); addDays(day, week * WEEK) < end; week++) {
    if (!isExcepted(event, addDays(day, week * WEEK))) shown.push(movedBy(event, day, week, tz));
  }

  return shown;
}

function isExcepted(event: SeriesEvent, day: string): boolean {
  return event.exdates?.includes(day) === true;
}

function firstWeek(day: string, first: string): number {
  const weeks = (parseDateKey(first).getTime() - parseDateKey(day).getTime()) / WEEK_MS;

  return Math.max(0, Math.ceil(weeks));
}

function movedBy<T extends SeriesEvent>(event: T, day: string, weeks: number, tz: string): T {
  if (weeks === 0) return event;

  const shownDay = addDays(day, weeks * WEEK);

  if (event.allDay) return { ...event, startAt: allDayStart(shownDay) };

  const start = new Date(event.startAt);

  const startAt = atMinute(shownDay, minutesOfDay(start, tz), tz);

  if (event.endAt === undefined) return { ...event, startAt: startAt.toISOString() };

  const length = new Date(event.endAt).getTime() - start.getTime();

  return {
    ...event,
    startAt: startAt.toISOString(),
    endAt: new Date(startAt.getTime() + length).toISOString(),
  };
}
