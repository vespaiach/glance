import type { AccountSettings } from "./schemas";
import { calendarDate, wallTime, zonedInstant } from "./zone";

export type Clock = AccountSettings["clock"];

export interface TimeParts {
  time: string;
  meridiem?: "AM" | "PM";
}

const WEEKDAY: Intl.DateTimeFormatOptions = { weekday: "short" };

const MONTH_DAY: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

const MONTH: Intl.DateTimeFormatOptions = { month: "long" };

const LONG_DATE: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" };

const DAY_TITLE: Intl.DateTimeFormatOptions = { weekday: "long", month: "short", day: "numeric" };

const DAY_NAME: Intl.DateTimeFormatOptions = { weekday: "short", month: "long", day: "numeric" };

const formatters = new Map<string, Intl.DateTimeFormat>();

const pad = (n: number) => String(n).padStart(2, "0");

export function minutesOfDay(date: Date, tz: string): number {
  const { hour, minute } = wallTime(date, tz);

  return hour * 60 + minute;
}

export function atMinute(dayKey: string, minutes: number, tz: string): Date {
  return zonedInstant(tz, calendarDate(dayKey), minutes);
}

export function timeParts(minutes: number, clock: Clock): TimeParts {
  const hours = Math.floor(minutes / 60);
  const mm = pad(minutes % 60);

  if (clock === "24h") return { time: `${pad(hours)}:${mm}` };

  return { time: `${hours % 12 || 12}:${mm}`, meridiem: hours < 12 ? "AM" : "PM" };
}

export function formatClock(minutes: number, clock: Clock): string {
  const { time, meridiem } = timeParts(minutes, clock);

  return meridiem ? `${time} ${meridiem}` : time;
}

export function clockAt(iso: string, clock: Clock, tz: string): string {
  return formatClock(minutesOfDay(new Date(iso), tz), clock);
}

export function formatRange(start: number, end: number | undefined, clock: Clock): string {
  const startText = timeParts(start, clock).time;

  if (end === undefined) return startText;

  return `${startText} – ${timeParts(end, clock).time}`;
}

export function rangeParts(start: number, end: number | undefined, clock: Clock): TimeParts {
  const from = timeParts(start, clock);

  if (end === undefined) return from;

  const to = timeParts(end, clock);

  const startText = from.meridiem === to.meridiem ? from.time : `${from.time} ${from.meridiem}`;

  return { ...to, time: `${startText} – ${to.time}` };
}

export function formatHour(minutes: number, clock: Clock): string {
  const { time, meridiem } = timeParts(minutes, clock);

  return meridiem ? `${time.split(":")[0]} ${meridiem}` : time;
}

export function formatLength(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest} min`;

  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest} min`;

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatWeekday(date: Date, tz: string): string {
  return formatIn(WEEKDAY, tz).format(date);
}

export function formatMonthDay(date: Date, tz: string): string {
  return formatIn(MONTH_DAY, tz).format(date);
}

export function formatLongDate(date: Date, tz: string): string {
  return formatIn(LONG_DATE, tz).format(date);
}

export function formatMonth(date: Date, tz: string): string {
  return formatIn(MONTH, tz).format(date);
}

export function formatDayTitle(date: Date, tz: string): string {
  return formatIn(DAY_TITLE, tz).format(date);
}

export function formatDayName(date: Date, tz: string): string {
  return formatIn(DAY_NAME, tz).format(date);
}

function formatIn(options: Intl.DateTimeFormatOptions, tz: string): Intl.DateTimeFormat {
  const key = `${JSON.stringify(options)}@${tz}`;

  const cached = formatters.get(key);

  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", { ...options, timeZone: tz });

  formatters.set(key, formatter);

  return formatter;
}
