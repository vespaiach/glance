import type { CalendarEvent } from "./schemas";
import { dayNumber } from "./zone";

export type EventStatus = "past" | "now" | "upcoming";

type EventSpan = Pick<CalendarEvent, "startAt" | "endAt">;

function statusToday({ startAt, endAt }: EventSpan, now: Date): EventStatus {
  const time = now.getTime();

  if (endAt !== undefined && Date.parse(endAt) <= time) return "past";

  return Date.parse(startAt) <= time ? "now" : "upcoming";
}

export function eventStatus(event: EventSpan, now: Date, tz: string): EventStatus {
  const dayOffset = dayNumber(new Date(event.startAt), tz) - dayNumber(now, tz);

  if (dayOffset < 0) return "past";

  if (dayOffset > 0) return "upcoming";

  return statusToday(event, now);
}
