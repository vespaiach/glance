import { eventDayKey } from "./allDay";
import { nextOccurrence } from "./repeat";
import type { CalendarEvent } from "./schemas";
import { addDays, dateKey, parseDateKey } from "./zone";

export type EventStatus = "past" | "now" | "upcoming" | "allDay";

export type DetailsStatus = "now" | "ended" | null;

export type StatusTitle =
  | { kind: "now" }
  | { kind: "in"; minutes: number }
  | { kind: "today" }
  | { kind: "tomorrow" }
  | { kind: "inDays"; days: number }
  | { kind: "ended" };

type EventSpan = Pick<CalendarEvent, "startAt" | "endAt" | "allDay">;

type SeriesSpan = EventSpan & Pick<CalendarEvent, "repeat">;

const MINUTE_MS = 60_000;

const DAY_MS = 86_400_000;

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

export function statusTitle(event: SeriesSpan, now: Date, tz: string): StatusTitle {
  if (event.repeat === "weekly") return weeklyTitle(event, now, tz);

  return spanTitle(event, now, tz);
}

function weeklyTitle(event: SeriesSpan, now: Date, tz: string): StatusTitle {
  const today = dateKey(now, tz);

  const title = spanTitle(nextOccurrence(event, today, tz) ?? event, now, tz);

  if (title.kind !== "ended") return title;

  return spanTitle(nextOccurrence(event, addDays(today, 1), tz) ?? event, now, tz);
}

function spanTitle(event: EventSpan, now: Date, tz: string): StatusTitle {
  const days = daysBetween(dateKey(now, tz), eventDayKey(event, tz));

  if (days < 0) return { kind: "ended" };

  if (days > 0) return days === 1 ? { kind: "tomorrow" } : { kind: "inDays", days };

  if (event.allDay) return { kind: "today" };

  return titleToday(event, now);
}

function titleToday(event: EventSpan, now: Date): StatusTitle {
  const status = statusToday(event, now);

  if (status === "past") return { kind: "ended" };

  if (status === "now") return { kind: "now" };

  return {
    kind: "in",
    minutes: Math.ceil((Date.parse(event.startAt) - now.getTime()) / MINUTE_MS),
  };
}

function daysBetween(from: string, to: string): number {
  return Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / DAY_MS);
}

function statusToday({ startAt, endAt }: EventSpan, now: Date): EventStatus {
  const time = now.getTime();

  if (endAt !== undefined && Date.parse(endAt) <= time) return "past";

  return Date.parse(startAt) <= time ? "now" : "upcoming";
}
