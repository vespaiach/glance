import type { AccountSettings, Ambient, AmbientSet } from "./schemas";
import { type Clock, formatClock } from "./time";
import { wallTime } from "./zone";

const DAY = 1440;

const NOON = 720;

const FRIDAY = 5;

export type AmbientRange = { start: string; end: string };

export type AmbientSummary =
  | { mode: "off" }
  | { mode: "same"; all: AmbientRange | null }
  | { mode: "split"; all: AmbientRange | null; wknd: AmbientRange | null };

type Night = { weekday: number; sinceNoon: number };

function toMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function pastNoon(minutes: number): number {
  return (minutes - NOON + DAY) % DAY;
}

function spanLength({ start, end }: AmbientSet): number {
  return (toMinutes(end) - toMinutes(start) + DAY) % DAY;
}

function nightOf(now: Date, tz: string): Night {
  const { weekday, hour, minute } = wallTime(now, tz);

  const minutes = hour * 60 + minute;

  return { weekday: minutes >= NOON ? weekday : (weekday + 6) % 7, sinceNoon: pastNoon(minutes) };
}

function nightRuns(set: AmbientSet | null, sinceNoon: number): boolean {
  if (set === null) return false;

  const dim = pastNoon(toMinutes(set.start));

  return sinceNoon >= dim && sinceNoon < dim + spanLength(set);
}

export function ambientSetFor(ambient: Ambient, weekday: number): AmbientSet | null {
  if (ambient.mode === "off") return null;

  if (ambient.mode === "split" && weekday >= FRIDAY) return ambient.wknd;

  return ambient.all;
}

export function inAmbient(ambient: Ambient, now: Date, tz: string): boolean {
  const { weekday, sinceNoon } = nightOf(now, tz);

  const tonight = ambientSetFor(ambient, weekday);

  const lastNight = ambientSetFor(ambient, (weekday + 6) % 7);

  return nightRuns(tonight, sinceNoon) || nightRuns(lastNight, sinceNoon + DAY);
}

function rangeOf(set: AmbientSet, clock: Clock): AmbientRange | null {
  if (spanLength(set) === 0) return null;

  return {
    start: formatClock(toMinutes(set.start), clock),
    end: formatClock(toMinutes(set.end), clock),
  };
}

export function ambientSummary(ambient: Ambient, clock: Clock): AmbientSummary {
  if (ambient.mode === "off") return { mode: "off" };

  const all = rangeOf(ambient.all, clock);

  if (ambient.mode === "same") return { mode: "same", all };

  return { mode: "split", all, wknd: rangeOf(ambient.wknd, clock) };
}

export function idleDue(
  lastActivity: Date,
  now: Date,
  idleTimeout: AccountSettings["idleTimeout"],
): boolean {
  if (idleTimeout === null) return false;

  return now.getTime() - lastActivity.getTime() >= idleTimeout * 1000;
}
