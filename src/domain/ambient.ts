import { localDayNumber } from "./time";

const AMBIENT_MIN_DIM = 0.55;

export function ambientDim(dim: number): number {
  return Math.max(dim, AMBIENT_MIN_DIM);
}

export function isTomorrow(date: Date, now: Date): boolean {
  return localDayNumber(date) - localDayNumber(now) === 1;
}
