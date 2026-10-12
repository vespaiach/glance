import { localDateKey, parseLocalDate } from "./time";

const monthYearFormat = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

const monthNameFormat = new Intl.DateTimeFormat("en-US", { month: "long" });

const initialFormat = new Intl.DateTimeFormat("en-US", { weekday: "narrow" });

const WEEK = 7;

const A_SUNDAY = new Date(2026, 9, 4);

export function monthCells(year: number, month: number): (number | null)[] {
  const leading = new Date(year, month, 1).getDay();
  const length = new Date(year, month + 1, 0).getDate();
  const trailing = (WEEK - ((leading + length) % WEEK)) % WEEK;

  const days = Array.from({ length }, (_, index) => index + 1);

  return [...Array(leading).fill(null), ...days, ...Array(trailing).fill(null)];
}

export function formatMonthYear(year: number, month: number): string {
  return monthYearFormat.format(new Date(year, month, 1));
}

export function weekdayInitials(): string[] {
  return Array.from({ length: WEEK }, (_, offset) =>
    initialFormat.format(
      new Date(A_SUNDAY.getFullYear(), A_SUNDAY.getMonth(), A_SUNDAY.getDate() + offset),
    ),
  );
}

export function monthTitle(year: number, month: number, now: Date): string {
  if (year !== now.getFullYear()) return formatMonthYear(year, month);

  return monthNameFormat.format(new Date(year, month, 1));
}

export function markedDays(events: readonly { startAt: string }[]): number[] {
  const days = new Set(events.map((event) => new Date(event.startAt).getDate()));

  return [...days].sort((a, b) => a - b);
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function readDateParam(value: string | null): string | undefined {
  if (value === null || !DATE_KEY.test(value)) return undefined;

  return localDateKey(parseLocalDate(value)) === value ? value : undefined;
}

export function stepMonth(selected: string, delta: -1 | 1, now: Date): string {
  const day = parseLocalDate(selected);

  const first = new Date(day.getFullYear(), day.getMonth() + delta, 1);

  const isCurrentMonth =
    first.getFullYear() === now.getFullYear() && first.getMonth() === now.getMonth();

  return localDateKey(isCurrentMonth ? now : first);
}
