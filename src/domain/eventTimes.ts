import { type Clock, minutesOfDay, type TimeParts } from "./time";

export interface EventTimes {
  start: number;
  end?: number;
}

export const LATEST_START = 23 * 60;

export const LATEST_END = 23 * 60 + 55;

export const END_GAP = 5;

const LATEST_TIMED_START = LATEST_END - END_GAP;

export type Meridiem = NonNullable<TimeParts["meridiem"]>;

export type MinuteStep = 5 | 15;

export function nextWholeHour(now: Date, tz: string): number {
  const next = (Math.floor(minutesOfDay(now, tz) / 60) + 1) * 60;

  return Math.min(next, LATEST_START);
}

export function defaultEnd(start: number): number {
  return Math.min(start + 60, LATEST_END);
}

export function defaultTimes(now: Date, tz: string): EventTimes {
  const start = nextWholeHour(now, tz);

  return { start, end: defaultEnd(start) };
}

export function slotTimes(slot: { start: Date; end: Date }, tz: string): EventTimes {
  return { start: minutesOfDay(slot.start, tz), end: minutesOfDay(slot.end, tz) };
}

export function endsAfterStart({ start, end }: EventTimes): boolean {
  return end === undefined || end > start;
}

export function moveStart(times: EventTimes, start: number): EventTimes {
  if (times.end === undefined) return { start };

  if (!endsAfterStart(times)) return { ...times, start };

  const capped = Math.min(start, LATEST_TIMED_START);

  return { start: capped, end: Math.min(capped + times.end - times.start, LATEST_END) };
}

export function pickEnd(start: number, end: number): number {
  return Math.min(Math.max(end, start + END_GAP), LATEST_END);
}

export function isEndHourDisabled(start: number, hour: number): boolean {
  return hour * 60 + 55 < start + END_GAP;
}

export function isEndMinuteDisabled(start: number, hour: number, minute: number): boolean {
  return hour * 60 + minute < start + END_GAP;
}

export function pickerMinutes(step: MinuteStep): number[] {
  return Array.from({ length: 60 / step }, (_, i) => i * step);
}

export function pickerHours(clock: Clock, meridiem?: Meridiem): number[] {
  if (clock === "24h") return Array.from({ length: 24 }, (_, hour) => hour);

  const offset = meridiem === "PM" ? 12 : 0;

  return Array.from({ length: 12 }, (_, hour) => hour + offset);
}

export function withHour(minutes: number, hour: number): number {
  return hour * 60 + (minutes % 60);
}

export function withMinute(minutes: number, minute: number): number {
  return Math.floor(minutes / 60) * 60 + minute;
}

export function withMeridiem(minutes: number, meridiem: Meridiem): number {
  return (minutes % 720) + (meridiem === "PM" ? 720 : 0);
}

export function endForLength(start: number, length: number): number {
  return Math.min(start + length, LATEST_END);
}
