import { dayNumber } from "./zone";

const AMBIENT_MIN_DIM = 0.55;

export function ambientDim(dim: number): number {
  return Math.max(dim, AMBIENT_MIN_DIM);
}

export function isTomorrow(date: Date, now: Date, tz: string): boolean {
  return dayNumber(date, tz) - dayNumber(now, tz) === 1;
}
