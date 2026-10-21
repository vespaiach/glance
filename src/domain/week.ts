import { eventDayKey } from "./allDay";
import type { CalendarEvent, Tag } from "./schemas";
import type { EventWho } from "./tags";
import { addDays, dateKey, parseDateKey } from "./zone";

export type WeekHeading = { year: string; month: string };

export type Dot = Pick<Tag, "id" | "color">;

export type PickerMonth = { key: string; label: string; days: string[] };

type DottedEvent = Pick<CalendarEvent, "startAt" | "allDay"> & EventWho;

const WEEK = 7;

const MONTHS_BEFORE = 2;

const MONTHS_AFTER = 3;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });

const monthYear = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function weekDays(day: string): string[] {
  const sunday = addDays(day, -parseDateKey(day).getUTCDay());

  return Array.from({ length: WEEK }, (_, offset) => addDays(sunday, offset));
}

export function stepWeek(day: string, delta: -1 | 1, today: string): string {
  const [sunday = day] = weekDays(addDays(day, delta * WEEK));

  return weekDays(sunday).includes(today) ? today : sunday;
}

export function weekHeading(day: string): WeekHeading {
  const saturday = parseDateKey(weekDays(day)[WEEK - 1] ?? day);

  return { year: String(saturday.getUTCFullYear()), month: monthName.format(saturday) };
}

export function weekDots(
  events: readonly DottedEvent[],
  tags: readonly Tag[],
  tz: string,
): Map<string, Dot[]> {
  const days = new Map<string, DottedEvent[]>();

  for (const event of events) {
    const key = eventDayKey(event, tz);

    days.set(key, [...(days.get(key) ?? []), event]);
  }

  return new Map([...days].map(([key, plans]) => [key, dotsFor(plans, tags)]));
}

export function pickerMonths(today: string): PickerMonth[] {
  const current = parseDateKey(today);

  return Array.from({ length: MONTHS_BEFORE + MONTHS_AFTER + 1 }, (_, index) =>
    pickerMonth(current.getUTCFullYear(), current.getUTCMonth() + index - MONTHS_BEFORE),
  );
}

export function readDateParam(value: string | null): string | undefined {
  if (value === null || !DATE_KEY.test(value)) return undefined;

  return dateKey(parseDateKey(value), "UTC") === value ? value : undefined;
}

function pickerMonth(year: number, month: number): PickerMonth {
  const first = new Date(Date.UTC(year, month, 1));

  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const start = dateKey(first, "UTC");

  return {
    key: start.slice(0, 7),
    label: monthYear.format(first),
    days: Array.from({ length }, (_, offset) => addDays(start, offset)),
  };
}

function dotsFor(plans: readonly DottedEvent[], tags: readonly Tag[]): Dot[] {
  return tags
    .filter((tag) => plans.some((plan) => plan.everyone || plan.tagIds.includes(tag.id)))
    .map(({ id, color }) => ({ id, color }));
}
