import { type Clock, minutesOfDay, type TimeParts } from "./time";

export interface EventTimes {
  start: number;
  end?: number;
}

export const LATEST_START = 23 * 60 + 30;

export const LATEST_END = 23 * 60 + 55;

export type Meridiem = NonNullable<TimeParts["meridiem"]>;

export type MinuteStep = 5 | 15;

export function nextHalfHour(now: Date, tz: string): number {
  const next = (Math.floor(minutesOfDay(now, tz) / 30) + 1) * 30;

  return Math.min(next, LATEST_START);
}

export function defaultEnd(start: number): number {
  return Math.min(start + 60, LATEST_END);
}

export function defaultTimes(now: Date, tz: string): EventTimes {
  const start = nextHalfHour(now, tz);

  return { start, end: defaultEnd(start) };
}

export function slotTimes(slot: { start: Date; end: Date }, tz: string): EventTimes {
  return { start: minutesOfDay(slot.start, tz), end: minutesOfDay(slot.end, tz) };
}

export function endsAfterStart({ start, end }: EventTimes): boolean {
  return end === undefined || end > start;
}

export function moveStart(times: EventTimes, start: number): EventTimes {
  if (times.end === undefined || !endsAfterStart(times)) return { ...times, start };

  return { start, end: Math.min(start + times.end - times.start, LATEST_END) };
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
