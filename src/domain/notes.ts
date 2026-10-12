import type { AccountSettings, Note } from "./schemas";
import {
  type Clock,
  formatClock,
  formatMonthDay,
  formatWeekday,
  localDayNumber,
  minutesOfDay,
} from "./time";

export type NoteStamp = { kind: "justNow" } | { kind: "at"; text: string };

const TILTS = [-2, 1.5, -1, 2.5] as const;

type TiltIndex = 0 | 1 | 2 | 3;

const JUST_NOW_MS = 5 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

const EXPIRY_MS = { "1d": DAY_MS, "1w": 7 * DAY_MS } as const;

export function noteTilt(noteCount: number): number {
  return TILTS[(noteCount % TILTS.length) as TiltIndex];
}

function stampText(created: Date, now: Date, clock: Clock): string {
  const daysAgo = localDayNumber(now) - localDayNumber(created);

  if (daysAgo === 0) return formatClock(minutesOfDay(created), clock);

  return daysAgo < 7 ? formatWeekday(created) : formatMonthDay(created);
}

export function noteStamp(createdAt: string, now: Date, clock: Clock): NoteStamp {
  const created = new Date(createdAt);

  if (now.getTime() - created.getTime() < JUST_NOW_MS) return { kind: "justNow" };

  return { kind: "at", text: stampText(created, now, clock) };
}

export function noteExpired(
  note: Pick<Note, "createdAt">,
  expiry: AccountSettings["noteExpiry"],
  now: Date,
): boolean {
  if (expiry === null) return false;

  return now.getTime() - Date.parse(note.createdAt) > EXPIRY_MS[expiry];
}
