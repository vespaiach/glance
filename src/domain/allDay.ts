import type { CalendarEvent } from "./schemas";
import { dateKey, parseDateKey } from "./zone";

type DatedEvent = Pick<CalendarEvent, "startAt" | "allDay">;

export function allDayStart(key: string): string {
  return parseDateKey(key).toISOString();
}

export function eventDayKey({ startAt, allDay }: DatedEvent, tz: string): string {
  return dateKey(new Date(startAt), allDay ? "UTC" : tz);
}
