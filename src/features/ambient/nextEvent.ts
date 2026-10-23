import { copy } from "@/copy";
import { eventDayKey } from "@/domain/allDay";
import { isTomorrow } from "@/domain/ambient";
import type { CalendarEvent } from "@/domain/schemas";
import { type Clock as ClockSetting, clockAt, formatMonthDay, formatWeekday } from "@/domain/time";
import { addDays, dateKey, parseDateKey } from "@/domain/zone";

export type NextEventLines = { eyebrow: string; title: string; place?: string };

export function nextEventLines(
  event: CalendarEvent,
  now: Date,
  clock: ClockSetting,
  tz: string,
): NextEventLines {
  const start = event.allDay ? copy.ambient.allDay : clockAt(event.startAt, clock, tz);

  const eyebrow = copy.ambient.next(eventDay(event, now, tz), start);

  return { eyebrow, title: event.title, ...(event.location && { place: event.location }) };
}

export function rainDay(date: string, now: Date, tz: string): string {
  if (date === addDays(dateKey(now, tz), 1)) return copy.ambient.tomorrow;

  return formatWeekday(parseDateKey(date), "UTC");
}

function eventDay(event: CalendarEvent, now: Date, tz: string): string {
  if (isTomorrow(event, now, tz)) return copy.ambient.tomorrow;

  const date = parseDateKey(eventDayKey(event, tz));

  return copy.ambient.day(formatWeekday(date, "UTC"), formatMonthDay(date, "UTC"));
}
