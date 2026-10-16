import { eventDayKey } from "./allDay";
import type { CalendarEvent } from "./schemas";
import { addDays, dateKey } from "./zone";

const AMBIENT_MIN_DIM = 0.55;

export function ambientDim(dim: number): number {
  return Math.max(dim, AMBIENT_MIN_DIM);
}

export function isTomorrow(
  event: Pick<CalendarEvent, "startAt" | "allDay">,
  now: Date,
  tz: string,
): boolean {
  return eventDayKey(event, tz) === addDays(dateKey(now, tz), 1);
}
