import type { CalendarEvent } from "./schemas";
import { localDayNumber } from "./time";

export type EventStatus = "past" | "now" | "upcoming";

type EventSpan = Pick<CalendarEvent, "startAt" | "endAt">;

function statusToday({ startAt, endAt }: EventSpan, now: Date): EventStatus {
  const time = now.getTime();

  if (endAt !== undefined && Date.parse(endAt) <= time) return "past";

  return Date.parse(startAt) <= time ? "now" : "upcoming";
}

export function eventStatus(event: EventSpan, now: Date): EventStatus {
  const dayOffset = localDayNumber(new Date(event.startAt)) - localDayNumber(now);

  if (dayOffset < 0) return "past";

  if (dayOffset > 0) return "upcoming";

  return statusToday(event, now);
}
