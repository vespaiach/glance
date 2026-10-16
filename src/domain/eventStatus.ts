import { eventDayKey } from "./allDay";
import type { CalendarEvent } from "./schemas";
import { dateKey } from "./zone";

export type EventStatus = "past" | "now" | "upcoming" | "allDay";

type EventSpan = Pick<CalendarEvent, "startAt" | "endAt" | "allDay">;

function statusToday({ startAt, endAt }: EventSpan, now: Date): EventStatus {
  const time = now.getTime();

  if (endAt !== undefined && Date.parse(endAt) <= time) return "past";

  return Date.parse(startAt) <= time ? "now" : "upcoming";
}

export function eventStatus(event: EventSpan, now: Date, tz: string): EventStatus {
  if (event.allDay) return "allDay";

  const day = eventDayKey(event, tz);

  const today = dateKey(now, tz);

  if (day < today) return "past";

  if (day > today) return "upcoming";

  return statusToday(event, now);
}
