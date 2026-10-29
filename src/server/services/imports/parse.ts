import ICAL from "ical.js";
import { copy } from "@/copy";
import { allDayStart, eventDayKey } from "@/domain/allDay";
import type { ImportedEvent } from "@/domain/imports";
import { nextOccurrence } from "@/domain/repeat";
import { err, ok, type Result } from "@/domain/result";
import { EVENT_LIMITS } from "@/domain/schemas";
import { addDays, dateKey, dayStart, zonedInstant } from "@/domain/zone";

export interface ParsedIcs {
  events: ImportedEvent[];
  range: { first: string; last: string };
}

export type IcsError = "not-ics" | "no-upcoming";

export const ICS_LIMITS = { bytes: 5 * 1024 * 1024, events: 1000 } as const;

type Event = InstanceType<typeof ICAL.Event>;

type Time = InstanceType<typeof ICAL.Time>;

interface Context {
  now: Date;
  tz: string;
  today: string;
  until: Date;
  events: Event[];
  expanded: Set<string>;
  steps: number;
}

const MAX_STEPS = 50_000;

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export function parseIcs(text: string, now: Date, tz: string): Result<ParsedIcs, IcsError> {
  if (new TextEncoder().encode(text).length > ICS_LIMITS.bytes) return err("not-ics");

  const today = dateKey(now, tz);

  const events = importedEvents(text, now, tz);

  if (events === undefined || events.length > ICS_LIMITS.events) return err("not-ics");

  if (events.length === 0) return err("no-upcoming");

  return ok(inDateOrder(events, today, tz));
}

function importedEvents(text: string, now: Date, tz: string): ImportedEvent[] | undefined {
  try {
    const calendar = new ICAL.Component(ICAL.parse(text));

    if (calendar.name !== "vcalendar") return undefined;

    return fromCalendar(calendar, now, tz);
  } catch {
    return undefined;
  }
}

function fromCalendar(
  calendar: InstanceType<typeof ICAL.Component>,
  now: Date,
  tz: string,
): ImportedEvent[] | undefined {
  const events = calendar.getAllSubcomponents("vevent").map((vevent) => new ICAL.Event(vevent));

  const expanded = new Set(
    events.filter((e) => e.isRecurring() && !isPlainWeekly(e)).map((e) => e.uid),
  );

  const context: Context = {
    now,
    tz,
    today: dateKey(now, tz),
    until: yearAfter(now),
    events,
    expanded,
    steps: 0,
  };

  const imported: ImportedEvent[] = [];

  for (const event of events) {
    imported.push(...eventsOf(event, context, ICS_LIMITS.events + 1 - imported.length));

    if (imported.length > ICS_LIMITS.events || context.steps > MAX_STEPS) return undefined;
  }

  return imported;
}

function eventsOf(event: Event, context: Context, room: number): ImportedEvent[] {
  if (event.isRecurring()) {
    return isPlainWeekly(event) ? [series(event, context)] : expand(event, context, room);
  }

  if (event.isRecurrenceException() && context.expanded.has(event.uid)) return [];

  return upcoming(occurrenceEvents(event, event.startDate, event.endDate, context, room), context);
}

function isPlainWeekly(event: Event): boolean {
  const rules = event.component.getAllProperties("rrule");

  if (rules.length !== 1 || event.component.hasProperty("rdate")) return false;

  const rule = rules[0]?.getFirstValue() as InstanceType<typeof ICAL.Recur>;

  const ownDay = WEEKDAYS[event.startDate.dayOfWeek() - 1] ?? "";

  const { BYDAY = [ownDay], ...others } = rule.parts;

  return (
    rule.freq === "WEEKLY" &&
    rule.interval === 1 &&
    !rule.until &&
    !rule.count &&
    Object.keys(others).length === 0 &&
    BYDAY.length === 1 &&
    BYDAY[0] === ownDay
  );
}

function series(event: Event, context: Context): ImportedEvent {
  const skipped = [...excludedDays(event, context), ...changedDays(event, context)];

  const exdates = [...new Set(skipped)].sort();

  return {
    ...firstWeek(event, context),
    repeat: "weekly",
    exdates: exdates.length > 0 ? exdates : undefined,
  };
}

function firstWeek(event: Event, context: Context): ImportedEvent {
  const start = event.startDate;

  if (start.isDate)
    return { ...fieldsOf(event), startAt: allDayStart(dateOf(start)), allDay: true };

  return timed(event, start, event.endDate, context);
}

function excludedDays(event: Event, context: Context): string[] {
  return event.component
    .getAllProperties("exdate")
    .flatMap((property) =>
      property.getValues().map((time) => dayOf(time as Time, zoneParameter(property), context)),
    );
}

function changedDays(event: Event, context: Context): string[] {
  return context.events
    .filter((change) => change.isRecurrenceException() && change.uid === event.uid)
    .map((change) => dayOf(change.recurrenceId, zoneOf(change, "recurrence-id"), context));
}

function expand(event: Event, context: Context, room: number): ImportedEvent[] {
  const changes = context.events.filter((e) => e.isRecurrenceException() && e.uid === event.uid);

  for (const change of changes) event.relateException(change);

  const iterator = event.iterator();

  const found: ImportedEvent[] = [];

  for (let next = iterator.next(); next && found.length < room; next = iterator.next()) {
    context.steps++;

    if (
      context.steps > MAX_STEPS ||
      instant(next, zoneOf(event, "dtstart"), context.tz) >= context.until
    )
      break;

    const { item, startDate, endDate } = event.getOccurrenceDetails(next);

    found.push(...upcoming(occurrenceEvents(item, startDate, endDate, context, room), context));
  }

  return found;
}

function occurrenceEvents(
  item: Event,
  start: Time,
  end: Time,
  context: Context,
  room: number,
): ImportedEvent[] {
  if (!start.isDate) return [timed(item, start, end, context)];

  const fields = fieldsOf(item);

  return allDays(start, end, context.today, room).map((day) => ({
    ...fields,
    startAt: allDayStart(day),
    allDay: true,
  }));
}

function timed(item: Event, start: Time, end: Time, context: Context): ImportedEvent {
  const startAt = instant(start, zoneOf(item, "dtstart"), context.tz);

  const endAt = instant(end, zoneOf(item, "dtend") ?? zoneOf(item, "dtstart"), context.tz);

  return {
    ...fieldsOf(item),
    startAt: startAt.toISOString(),
    endAt: cutEnd(startAt, endAt, context.tz),
  };
}

function cutEnd(start: Date, end: Date, tz: string): string | undefined {
  if (end <= start) return undefined;

  const midnight = dayStart(addDays(dateKey(start, tz), 1), tz);

  return (end < midnight ? end : midnight).toISOString();
}

function allDays(start: Time, end: Time, today: string, room: number): string[] {
  const first = dateOf(start);

  const last = end.isDate && dateOf(end) > first ? dateOf(end) : addDays(first, 1);

  const days: string[] = [];

  for (
    let day = first > today ? first : today;
    day < last && days.length < room;
    day = addDays(day, 1)
  ) {
    days.push(day);
  }

  return days;
}

function upcoming(events: ImportedEvent[], context: Context): ImportedEvent[] {
  return events.filter((event) =>
    event.allDay
      ? event.startAt.slice(0, 10) >= context.today
      : new Date(event.endAt ?? event.startAt) > context.now,
  );
}

function fieldsOf(item: Event): Pick<ImportedEvent, "title" | "location" | "notes"> {
  return {
    title: cut(item.summary, EVENT_LIMITS.title) || copy.imports.untitled,
    location: cut(item.location, EVENT_LIMITS.location) || undefined,
    notes: cut(item.description, EVENT_LIMITS.notes) || undefined,
  };
}

function cut(text: string | null | undefined, limit: number): string {
  return (text ?? "")
    .trim()
    .slice(0, limit)
    .replace(/[\uD800-\uDBFF]$/, "");
}

function dayOf(time: Time, zone: string | undefined, context: Context): string {
  if (time.isDate) return dateOf(time);

  return dateKey(instant(time, zone, context.tz), context.tz);
}

function instant(time: Time, zone: string | undefined, tz: string): Date {
  if (time.zone.tzid !== "floating") return new Date(time.toUnixTime() * 1000);

  const wallZone = zone !== undefined && isTimeZone(zone) ? zone : tz;

  const minute = zonedInstant(wallZone, time, time.hour * 60 + time.minute);

  return new Date(minute.getTime() + time.second * 1000);
}

function zoneOf(item: Event, name: string): string | undefined {
  const property = item.component.getFirstProperty(name);

  return property ? zoneParameter(property) : undefined;
}

function zoneParameter(property: InstanceType<typeof ICAL.Property>): string | undefined {
  const tzid = property.getParameter("tzid");

  return typeof tzid === "string" ? tzid : undefined;
}

function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });

    return true;
  } catch {
    return false;
  }
}

function dateOf(time: Time): string {
  return time.toString().slice(0, 10);
}

function yearAfter(now: Date): Date {
  const until = new Date(now);

  until.setUTCFullYear(until.getUTCFullYear() + 1);

  return until;
}

function inDateOrder(events: ImportedEvent[], today: string, tz: string): ParsedIcs {
  const dated = events.map((event) => ({ event, day: shownDay(event, today, tz) }));

  dated.sort((a, b) => sortKey(a.event, a.day).localeCompare(sortKey(b.event, b.day)));

  const days = dated.map(({ day }) => day).sort();

  return {
    events: dated.map(({ event }) => event),
    range: { first: days[0] ?? today, last: days[days.length - 1] ?? today },
  };
}

function shownDay(event: ImportedEvent, today: string, tz: string): string {
  return eventDayKey(nextOccurrence(event, today, tz) ?? event, tz);
}

function sortKey(event: ImportedEvent, day: string): string {
  return `${day} ${event.allDay ? 0 : 1} ${event.startAt}`;
}
