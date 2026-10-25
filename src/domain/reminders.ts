import type { AccountSettings, CalendarEvent } from "./schemas";
import { addDays, dateKey, dayStart } from "./zone";

export type NotifyLead = AccountSettings["notifyLead"];

export type ReminderEvent = Pick<CalendarEvent, "id" | "title" | "startAt" | "allDay" | "notify">;

export type ReminderGroup<T extends ReminderEvent = ReminderEvent> = {
  fireAt: number;
  startAt: string;
  events: T[];
  keys: string[];
  titles: string[];
  more: number;
};

export type AmbientReminder<T> = { event: T; atStart: boolean };

type Fire<T> = { event: T; fireAt: number; start: number };

const MINUTE = 60_000;

const SHOWN_TITLES = 2;

const MAX_TITLES = 3;

export function remindersDue<T extends ReminderEvent>(
  events: readonly T[],
  lead: NotifyLead,
  now: Date,
  seen: ReadonlySet<string>,
): ReminderGroup<T>[] {
  const due = events
    .flatMap((event) => fires(event, lead))
    .filter((fire) => isDue(fire, now.getTime()))
    .filter((fire) => !seen.has(fireKey(fire)));

  return groupByMinute(due);
}

export function reminderKey(eventId: string, fireAt: number): string {
  return `${eventId}:${fireAt}`;
}

export function minutesLeft(group: Pick<ReminderGroup, "startAt">, now: Date): number {
  return Math.max(0, Math.ceil((Date.parse(group.startAt) - now.getTime()) / MINUTE));
}

export function ambientReminder<T extends ReminderEvent & Pick<CalendarEvent, "endAt">>(
  events: readonly T[],
  lead: NotifyLead,
  now: Date,
  tz: string,
): AmbientReminder<T> | undefined {
  const time = now.getTime();

  const [latest] = events
    .filter((event) => holdsSlot(event, lead, time, tz))
    .sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt));

  return latest && { event: latest, atStart: time >= Date.parse(latest.startAt) };
}

function holdsSlot(
  event: ReminderEvent & Pick<CalendarEvent, "endAt">,
  lead: NotifyLead,
  time: number,
  tz: string,
) {
  const [first] = fires(event, lead);

  return first !== undefined && time >= first.fireAt && time < slotEnd(event, tz);
}

function slotEnd({ startAt, endAt }: Pick<CalendarEvent, "startAt" | "endAt">, tz: string): number {
  if (endAt !== undefined) return Date.parse(endAt);

  return dayStart(addDays(dateKey(new Date(startAt), tz), 1), tz).getTime();
}

function fires<T extends ReminderEvent>(event: T, lead: NotifyLead): Fire<T>[] {
  if (lead === "off" || event.allDay || event.notify === false) return [];

  const start = Date.parse(event.startAt);

  return [{ event, start, fireAt: start - lead * MINUTE }];
}

function isDue({ fireAt, start }: Fire<unknown>, time: number): boolean {
  if (time < fireAt) return false;

  return time - fireAt < MINUTE || time < start;
}

function fireKey({ event, fireAt }: Fire<ReminderEvent>): string {
  return reminderKey(event.id, fireAt);
}

function groupByMinute<T extends ReminderEvent>(due: Fire<T>[]): ReminderGroup<T>[] {
  const groups = new Map<number, Fire<T>[]>();

  for (const fire of due) {
    const key = Math.floor(fire.fireAt / MINUTE);

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
    fireAt: first.fireAt,
    startAt: first.event.startAt,
    events: ordered.map((fire) => fire.event),
    keys: ordered.map(fireKey),
    titles: shown,
    more: titles.length - shown.length,
  };
}
