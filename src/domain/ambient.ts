import { eventDayKey } from "./allDay";
import type { CalendarEvent } from "./schemas";
import { addDays, dateKey } from "./zone";

export type AmbientStatus = "signedOut" | "offline";

export type DriftOffset = { x: number; y: number };

const AMBIENT_MIN_DIM = 0.6;

const DRIFT_MS = 2 * 60 * 1000;

const DRIFT_OFFSETS: readonly DriftOffset[] = [
  { x: 0, y: 0 },
  { x: 4, y: 2 },
  { x: 6, y: -2 },
  { x: 2, y: -5 },
  { x: -3, y: -4 },
  { x: -6, y: 1 },
  { x: -4, y: 5 },
  { x: 1, y: 4 },
];

export function ambientDim(dim: number): number {
  return Math.max(dim, AMBIENT_MIN_DIM);
}

export function isTomorrow(
  event: Pick<CalendarEvent, "startAt" | "allDay">,
  now: Date,
  tz: string,
): boolean {
  return eventDayKey(event, tz) === addDays(dateKey(now, tz), 1);
}

export function ambientStatus({
  signedOut,
  offline,
}: {
  signedOut: boolean;
  offline: boolean;
}): AmbientStatus | null {
  if (signedOut) return "signedOut";

  return offline ? "offline" : null;
}

export function driftStep(now: Date): number {
  return Math.floor(now.getTime() / DRIFT_MS) % DRIFT_OFFSETS.length;
}

export function driftOffset(step: number): DriftOffset {
  return DRIFT_OFFSETS[step % DRIFT_OFFSETS.length] ?? { x: 0, y: 0 };
}
