import { copy } from "@/copy";
import { eventDayKey } from "@/domain/allDay";
import { isTomorrow } from "@/domain/ambient";
import type { CalendarEvent } from "@/domain/schemas";
import { type Clock as ClockSetting, clockAt, formatMonthDay, formatWeekday } from "@/domain/time";
import { parseDateKey } from "@/domain/zone";

export function eventLine(
  event: CalendarEvent,
  now: Date,
  clock: ClockSetting,
  tz: string,
): string {
  const start = event.allDay ? copy.ambient.allDay : clockAt(event.startAt, clock, tz);

  return copy.ambient.event(eventDay(event, now, tz), start, event.title, event.location);
}

function eventDay(event: CalendarEvent, now: Date, tz: string): string {
  if (isTomorrow(event, now, tz)) return copy.ambient.tomorrow;

  const date = parseDateKey(eventDayKey(event, tz));

  return copy.ambient.day(formatWeekday(date, "UTC"), formatMonthDay(date, "UTC"));
}
