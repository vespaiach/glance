import { eventDayKey } from "./allDay";
import type { CalendarEvent, Tag } from "./schemas";
import type { EventWho } from "./tags";
import { addDays, dateKey, parseDateKey } from "./zone";

export type WeekHeading = {
  from: string;
  to: string;
  year: string | undefined;
  month: string;
};

export type Dot = Pick<Tag, "id" | "color">;

export type PickerMonth = { key: string; label: string; leading: number; days: string[] };

type DottedEvent = Pick<CalendarEvent, "startAt" | "allDay"> & EventWho;

type DatedEvent = Pick<CalendarEvent, "startAt" | "allDay">;

const WEEK = 7;

const PICKER_YEARS = 2;

const MONTHS_IN_YEAR = 12;

const DOTS_MAX = 3;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });

const shortMonth = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

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

export function weekHeading(day: string, today: string): WeekHeading {
  const week = weekDays(day);

  const sunday = parseDateKey(week[0] ?? day);

  const saturday = parseDateKey(week[WEEK - 1] ?? day);

  const year = saturday.getUTCFullYear();

  return {
    from: `${shortMonth.format(sunday)} ${sunday.getUTCDate()}`,
    to: sameMonth(sunday, saturday)
      ? String(saturday.getUTCDate())
      : `${shortMonth.format(saturday)} ${saturday.getUTCDate()}`,
    year: year === parseDateKey(today).getUTCFullYear() ? undefined : String(year),
    month: monthName.format(saturday),
  };
}

export function dayCounts(events: readonly DatedEvent[], tz: string): Map<string, number> {
  const counts = new Map<string, number>();

  for (const event of events) {
    const key = eventDayKey(event, tz);

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
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
  const year = parseDateKey(today).getUTCFullYear();

  return Array.from({ length: PICKER_YEARS * MONTHS_IN_YEAR }, (_, index) =>
    pickerMonth(year, index),
  );
}

export function pickerMonthIndex(months: readonly Pick<PickerMonth, "key">[], day: string): number {
  const key = day.slice(0, 7);

  const index = months.findIndex((month) => month.key === key);

  if (index >= 0) return index;

  return key < (months[0]?.key ?? key) ? 0 : months.length - 1;
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
    leading: first.getUTCDay(),
    days: Array.from({ length }, (_, offset) => addDays(start, offset)),
  };
}

function dotsFor(plans: readonly DottedEvent[], tags: readonly Tag[]): Dot[] {
  return tags
    .filter((tag) => plans.some((plan) => plan.everyone || plan.tagIds.includes(tag.id)))
    .slice(0, DOTS_MAX)
    .map(({ id, color }) => ({ id, color }));
}

function sameMonth(first: Date, second: Date): boolean {
  return first.getUTCMonth() === second.getUTCMonth();
}
