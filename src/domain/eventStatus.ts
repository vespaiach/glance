import { eventDayKey } from "./allDay";
import type { CalendarEvent } from "./schemas";
import { dateKey } from "./zone";

export type EventStatus = "past" | "now" | "upcoming" | "allDay";

export type DetailsStatus = "now" | "ended" | null;

type EventSpan = Pick<CalendarEvent, "startAt" | "endAt" | "allDay">;

export function eventStatus(event: EventSpan, now: Date, tz: string): EventStatus {
  if (event.allDay) return "allDay";

  const day = eventDayKey(event, tz);

  const today = dateKey(now, tz);

  if (day < today) return "past";

  if (day > today) return "upcoming";

  return statusToday(event, now);
}

export function detailsStatus(event: EventSpan, now: Date, tz: string): DetailsStatus {
  if (event.allDay) return eventDayKey(event, tz) < dateKey(now, tz) ? "ended" : null;

  const status = eventStatus(event, now, tz);

  if (status === "past") return "ended";

  return status === "now" ? "now" : null;
}

function statusToday({ startAt, endAt }: EventSpan, now: Date): EventStatus {
  const time = now.getTime();

  if (endAt !== undefined && Date.parse(endAt) <= time) return "past";

  return Date.parse(startAt) <= time ? "now" : "upcoming";
}
