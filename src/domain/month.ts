import { eventDayKey } from "./allDay";
import type { CalendarEvent } from "./schemas";
import { calendarDate, dateKey, parseDateKey, wallTime } from "./zone";

const monthYearFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const monthNameFormat = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });

const initialFormat = new Intl.DateTimeFormat("en-US", { weekday: "narrow", timeZone: "UTC" });

const WEEK = 7;

const A_SUNDAY = Date.UTC(2026, 9, 4);

const DAY_MS = 86_400_000;

const firstOf = (year: number, month: number) => new Date(Date.UTC(year, month, 1));

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function monthCells(year: number, month: number): (number | null)[] {
  const leading = firstOf(year, month).getUTCDay();
  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const trailing = (WEEK - ((leading + length) % WEEK)) % WEEK;

  const days = Array.from({ length }, (_, index) => index + 1);

  return [...Array(leading).fill(null), ...days, ...Array(trailing).fill(null)];
}

export function formatMonthYear(year: number, month: number): string {
  return monthYearFormat.format(firstOf(year, month));
}

export function weekdayInitials(): string[] {
  return Array.from({ length: WEEK }, (_, offset) =>
    initialFormat.format(new Date(A_SUNDAY + offset * DAY_MS)),
  );
}

export function monthTitle(year: number, month: number, now: Date, tz: string): string {
  if (year !== wallTime(now, tz).year) return formatMonthYear(year, month);

  return monthNameFormat.format(firstOf(year, month));
}

export function markedDays(
  events: readonly Pick<CalendarEvent, "startAt" | "allDay">[],
  tz: string,
): number[] {
  const days = new Set(events.map((event) => calendarDate(eventDayKey(event, tz)).day));

  return [...days].sort((a, b) => a - b);
}

export function readDateParam(value: string | null): string | undefined {
  if (value === null || !DATE_KEY.test(value)) return undefined;

  return dateKey(parseDateKey(value), "UTC") === value ? value : undefined;
}

export function stepMonth(selected: string, delta: -1 | 1, now: Date, tz: string): string {
  const day = parseDateKey(selected);

  const first = firstOf(day.getUTCFullYear(), day.getUTCMonth() + delta);

  const today = dateKey(now, tz);

  const isCurrentMonth = dateKey(first, "UTC").slice(0, 7) === today.slice(0, 7);

  return isCurrentMonth ? today : dateKey(first, "UTC");
}
