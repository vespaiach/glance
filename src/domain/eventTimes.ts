import { minutesOfDay } from "./time";

export interface EventTimes {
  start: number;
  end?: number;
}

export const LATEST_START = 23 * 60 + 30;

export const LATEST_END = 23 * 60 + 55;

export function nextHalfHour(now: Date): number {
  const next = (Math.floor(minutesOfDay(now) / 30) + 1) * 30;

  return Math.min(next, LATEST_START);
}

export function defaultEnd(start: number): number {
  return Math.min(start + 60, LATEST_END);
}

export function defaultTimes(now: Date): EventTimes {
  const start = nextHalfHour(now);

  return { start, end: defaultEnd(start) };
}

export function endsAfterStart({ start, end }: EventTimes): boolean {
  return end === undefined || end > start;
}

export function moveStart(times: EventTimes, start: number): EventTimes {
  if (times.end === undefined || !endsAfterStart(times)) return { ...times, start };

  return { start, end: Math.min(start + times.end - times.start, LATEST_END) };
}
