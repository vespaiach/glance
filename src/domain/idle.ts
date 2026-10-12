import type { AccountSettings } from "./schemas";
import { minutesOfDay } from "./time";

type AmbientHours = AccountSettings["ambientHours"];

function toMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

export function inAmbientHours(hours: AmbientHours, now: Date): boolean {
  const minute = minutesOfDay(now);

  const start = toMinutes(hours.start);

  const end = toMinutes(hours.end);

  return start <= end ? minute >= start && minute < end : minute >= start || minute < end;
}

export function idleDue(
  lastActivity: Date,
  now: Date,
  idleTimeout: AccountSettings["idleTimeout"],
): boolean {
  if (idleTimeout === null) return false;

  return now.getTime() - lastActivity.getTime() >= idleTimeout * 1000;
}
