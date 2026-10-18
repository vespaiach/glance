export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export interface WallTime extends CalendarDate {
  hour: number;
  minute: number;
  weekday: number;
}

const DAY_MS = 86_400_000;

const MINUTE_MS = 60_000;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatters = new Map<string, Intl.DateTimeFormat>();

const pad = (n: number) => String(n).padStart(2, "0");

export function wallTime(instant: Date, tz: string): WallTime {
  const parts = formatterFor(tz).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return {
    year: Number(part("year")),
    month: Number(part("month")),
    day: Number(part("day")),
    hour: Number(part("hour")) % 24,
    minute: Number(part("minute")),
    weekday: WEEKDAYS.indexOf(part("weekday")),
  };
}

export function zonedInstant(tz: string, date: CalendarDate, minutes: number): Date {
  const asked = Date.UTC(date.year, date.month - 1, date.day, 0, minutes);
  const before = asked - offsetMs(asked - DAY_MS, tz);
  const after = asked - offsetMs(asked + DAY_MS, tz);

  const readsBack = (candidate: number) => wallMs(wallTime(new Date(candidate), tz)) === asked;
  const matches = [before, after].filter(readsBack);

  return new Date(matches.length > 0 ? Math.min(...matches) : before);
}

export function dayNumber(instant: Date, tz: string): number {
  const { year, month, day } = wallTime(instant, tz);

  return Date.UTC(year, month - 1, day) / DAY_MS;
}

export function dateKey(instant: Date, tz: string): string {
  const { year, month, day } = wallTime(instant, tz);

  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseDateKey(key: string): Date {
  const [year = 1970, month = 1, day = 1] = key.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(key: string, n: number): string {
  return new Date(parseDateKey(key).getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

export function calendarDate(key: string): CalendarDate {
  const date = parseDateKey(key);

  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function dayStart(key: string, tz: string): Date {
  return zonedInstant(tz, calendarDate(key), 0);
}

export function displayTimeZone(
  settings: { weatherLocation?: { timeZone?: string } },
  fallback: string,
): string {
  return settings.weatherLocation?.timeZone ?? fallback;
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function formatterFor(tz: string): Intl.DateTimeFormat {
  const cached = formatters.get(tz);

  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
  });

  formatters.set(tz, formatter);

  return formatter;
}

function wallMs(wall: WallTime): number {
  return Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
}

function offsetMs(instantMs: number, tz: string): number {
  const minuteMs = Math.floor(instantMs / MINUTE_MS) * MINUTE_MS;

  return wallMs(wallTime(new Date(minuteMs), tz)) - minuteMs;
}
