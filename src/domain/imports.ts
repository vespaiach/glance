import { eventDayKey } from "./allDay";
import { occurrencesBetween } from "./repeat";
import type { CalendarEvent } from "./schemas";
import { addDays } from "./zone";

export type ImportedEvent = Pick<
  CalendarEvent,
  "title" | "startAt" | "endAt" | "allDay" | "location" | "notes" | "repeat" | "exdates"
>;

type Comparable = Pick<
  CalendarEvent,
  "title" | "startAt" | "endAt" | "allDay" | "repeat" | "exdates"
>;

export type Marked<T> = T & { duplicate: boolean };

export type ReviewEvent = Marked<
  Pick<CalendarEvent, "title" | "startAt" | "endAt" | "allDay" | "repeat">
>;

export type ImportReview = {
  id: string;
  fileName: string;
  size: number;
  range: { first: string; last: string };
  events: ReviewEvent[];
  newCount: number;
  duplicates: number;
};

export type ImportWho = "everyone" | string;

export type ImportResult = {
  count: number;
  range: { first: string; last: string };
  who: ImportWho;
};

export type LastImport = {
  id: string;
  importedAt: string;
  count: number;
  who: ImportWho;
  undoUntil: string;
};

export function markDuplicates<T extends Comparable>(
  events: readonly T[],
  calendar: readonly Comparable[],
  tz: string,
): Marked<T>[] {
  const known: Comparable[] = [...calendar];

  return events.map((event) => {
    const duplicate = known.some((other) => isSameEvent(event, other, tz));

    known.push(event);

    return { ...event, duplicate };
  });
}

function isSameEvent(event: Comparable, other: Comparable, tz: string): boolean {
  if (event.title.toLowerCase() !== other.title.toLowerCase()) return false;

  return weeksOnDayOf(other, event, tz).some((shown) => sameTimes(shown, event));
}

function weeksOnDayOf(other: Comparable, event: Comparable, tz: string): Comparable[] {
  if (other.repeat !== "weekly" || event.repeat === "weekly") return [other];

  const day = eventDayKey(event, tz);

  return occurrencesBetween([other], day, addDays(day, 1), tz);
}

function sameTimes(a: Comparable, b: Comparable): boolean {
  return a.startAt === b.startAt && a.endAt === b.endAt && a.allDay === b.allDay;
}
