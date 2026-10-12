import type { AccountSettings, Note } from "./schemas";
import { type Clock, formatClock, formatMonthDay, formatWeekday, minutesOfDay } from "./time";
import { dayNumber } from "./zone";

export type BoardNote = Note & { waiting?: boolean };

export type NoteStamp = { kind: "justNow" } | { kind: "at"; text: string };

const TILTS = [-2, 1.5, -1, 2.5] as const;

type TiltIndex = 0 | 1 | 2 | 3;

const JUST_NOW_MS = 5 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

const EXPIRY_MS = { "1d": DAY_MS, "1w": 7 * DAY_MS } as const;

export function noteTilt(noteCount: number): number {
  return TILTS[(noteCount % TILTS.length) as TiltIndex];
}

function stampText(created: Date, now: Date, clock: Clock, tz: string): string {
  const daysAgo = dayNumber(now, tz) - dayNumber(created, tz);

  if (daysAgo === 0) return formatClock(minutesOfDay(created, tz), clock);

  return daysAgo < 7 ? formatWeekday(created, tz) : formatMonthDay(created, tz);
}

export function noteStamp(createdAt: string, now: Date, clock: Clock, tz: string): NoteStamp {
  const created = new Date(createdAt);

  if (now.getTime() - created.getTime() < JUST_NOW_MS) return { kind: "justNow" };

  return { kind: "at", text: stampText(created, now, clock, tz) };
}

export function noteExpired(
  note: Pick<Note, "createdAt">,
  expiry: AccountSettings["noteExpiry"],
  now: Date,
): boolean {
  if (expiry === null) return false;

  return now.getTime() - Date.parse(note.createdAt) > EXPIRY_MS[expiry];
}

export function noteWaitingToPost(note: { pending: boolean; version: number }): boolean {
  return note.pending && note.version === 0;
}
