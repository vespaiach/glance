import type { CalendarEvent } from "./schemas";

export type ReminderKind = "15min" | "start";

export type ReminderEvent = Pick<CalendarEvent, "id" | "title" | "startAt" | "allDay" | "reminder">;

export type ReminderGroup<T extends ReminderEvent = ReminderEvent> = {
  kind: ReminderKind;
  fireAt: number;
  startAt: string;
  events: T[];
  keys: string[];
  titles: string[];
  more: number;
};

type Fire<T> = { event: T; kind: ReminderKind; fireAt: number; start: number };

const MINUTE = 60_000;

const LEAD = 15 * MINUTE;

const SHOWN_TITLES = 2;

const MAX_TITLES = 3;

const KINDS: Record<CalendarEvent["reminder"], readonly ReminderKind[]> = {
  off: [],
  start: ["start"],
  "15min": ["15min"],
  both: ["15min", "start"],
};

export function remindersDue<T extends ReminderEvent>(
  events: readonly T[],
  now: Date,
  seen: ReadonlySet<string>,
): ReminderGroup<T>[] {
  const due = events
    .flatMap(fires)
    .filter((fire) => isDue(fire, now.getTime()))
    .filter((fire) => !seen.has(fireKey(fire)));

  return groupByMinute(due);
}

export function reminderKey(eventId: string, kind: ReminderKind, fireAt: number): string {
  return `${eventId}:${kind}:${fireAt}`;
}

export function minutesLeft(group: Pick<ReminderGroup, "startAt">, now: Date): number {
  return Math.max(0, Math.ceil((Date.parse(group.startAt) - now.getTime()) / MINUTE));
}

function fires<T extends ReminderEvent>(event: T): Fire<T>[] {
  if (event.allDay) return [];

  const start = Date.parse(event.startAt);

  return KINDS[event.reminder].map((kind) => ({
    event,
    kind,
    start,
    fireAt: kind === "15min" ? start - LEAD : start,
  }));
}

function isDue({ fireAt, start }: Fire<unknown>, time: number): boolean {
  if (time < fireAt) return false;

  return time - fireAt < MINUTE || time < start;
}

function fireKey({ event, kind, fireAt }: Fire<ReminderEvent>): string {
  return reminderKey(event.id, kind, fireAt);
}

function groupByMinute<T extends ReminderEvent>(due: Fire<T>[]): ReminderGroup<T>[] {
  const groups = new Map<string, Fire<T>[]>();

  for (const fire of due) {
    const key = `${fire.kind}:${Math.floor(fire.fireAt / MINUTE)}`;

    groups.set(key, [...(groups.get(key) ?? []), fire]);
  }

  return [...groups.values()].map(toGroup).sort((a, b) => a.fireAt - b.fireAt);
}

function toGroup<T extends ReminderEvent>(fires: Fire<T>[]): ReminderGroup<T> {
  const ordered = [...fires].sort((a, b) => a.start - b.start);

  const [first] = ordered as [Fire<T>, ...Fire<T>[]];

  const titles = ordered.map((fire) => fire.event.title);

  const shown = titles.length > MAX_TITLES ? titles.slice(0, SHOWN_TITLES) : titles;

  return {
    kind: first.kind,
    fireAt: first.fireAt,
    startAt: first.event.startAt,
    events: ordered.map((fire) => fire.event),
    keys: ordered.map(fireKey),
    titles: shown,
    more: titles.length - shown.length,
  };
}
