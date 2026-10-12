import type { AccountSettings } from "./schemas";

export type Clock = AccountSettings["clock"];

export interface TimeParts {
  time: string;
  meridiem?: "AM" | "PM";
}

const weekdayFormat = new Intl.DateTimeFormat("en-US", { weekday: "short" });

const monthDayFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

const pad = (n: number) => String(n).padStart(2, "0");

export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
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

export function formatRange(start: number, end: number | undefined, clock: Clock): string {
  const startText = timeParts(start, clock).time;

  if (end === undefined) return startText;

  return `${startText} – ${timeParts(end, clock).time}`;
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

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseLocalDate(key: string): Date {
  const [year = 0, month = 1, day = 1] = key.split("-").map(Number);

  return new Date(year, month - 1, day);
}

export function localDayNumber(date: Date): number {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

export function formatWeekday(date: Date): string {
  return weekdayFormat.format(date);
}

export function formatMonthDay(date: Date): string {
  return monthDayFormat.format(date);
}
