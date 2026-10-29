import { statusTitle } from "./eventStatus";
import type { CalendarEvent, Tag } from "./schemas";
import { minutesOfDay } from "./time";
import { dateKey, wallTime } from "./zone";

type ExportEvent = Pick<
  CalendarEvent,
  | "id"
  | "title"
  | "startAt"
  | "endAt"
  | "allDay"
  | "location"
  | "notes"
  | "everyone"
  | "tagIds"
  | "repeat"
  | "exdates"
>;

type Person = Pick<Tag, "id" | "name">;

export type IcsLabels = { forWho: (names: string) => string; everyone: string };

const CRLF = "\r\n";

const FOLD_OCTETS = 75;

const encoder = new TextEncoder();

const pad = (n: number) => String(n).padStart(2, "0");

export function exportableEvents<T extends ExportEvent>(
  events: readonly T[],
  now: Date,
  tz: string,
): T[] {
  const kept = events.filter((event) => statusTitle(event, now, tz).kind !== "ended");

  return kept.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
}

export function toIcs(
  events: readonly ExportEvent[],
  people: readonly Person[],
  now: Date,
  tz: string,
  labels: IcsLabels,
): string {
  const vevents = exportableEvents(events, now, tz).flatMap((event) =>
    vevent({ ...event, notes: description(event, people, labels) }, now, tz),
  );

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Glance//Calendar//EN",
    "CALSCALE:GREGORIAN",
    ...vevents,
    "END:VCALENDAR",
  ];

  return lines.map(fold).join(CRLF) + CRLF;
}

function vevent(event: ExportEvent, now: Date, tz: string): string[] {
  const start = new Date(event.startAt);

  const dates = event.allDay
    ? [`DTSTART;VALUE=DATE:${dateKey(start, "UTC").replaceAll("-", "")}`]
    : [
        `DTSTART:${localStamp(start, tz)}`,
        ...(event.endAt ? [`DTEND:${localStamp(new Date(event.endAt), tz)}`] : []),
      ];

  return [
    "BEGIN:VEVENT",
    `UID:${event.id}@glance.app`,
    `DTSTAMP:${utcStamp(now)}`,
    ...dates,
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    `DESCRIPTION:${escapeText(event.notes ?? "")}`,
    ...repeatLines(event, minutesOfDay(start, tz)),
    "END:VEVENT",
  ];
}

function repeatLines(event: ExportEvent, minutes: number): string[] {
  if (event.repeat !== "weekly") return [];

  const exdates = (event.exdates ?? []).map((day) =>
    event.allDay
      ? `EXDATE;VALUE=DATE:${day.replaceAll("-", "")}`
      : `EXDATE:${day.replaceAll("-", "")}T${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`,
  );

  return ["RRULE:FREQ=WEEKLY", ...exdates];
}

function description(event: ExportEvent, people: readonly Person[], labels: IcsLabels): string {
  const names = event.everyone
    ? labels.everyone
    : event.tagIds
        .flatMap((id) => people.find((person) => person.id === id)?.name ?? [])
        .join(", ");

  return [event.notes, labels.forWho(names)].filter(Boolean).join("\n");
}

function localStamp(instant: Date, tz: string): string {
  const { year, month, day, hour, minute } = wallTime(instant, tz);

  return `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;
}

function utcStamp(instant: Date): string {
  return `${instant.toISOString().slice(0, 19).replaceAll(/[-:]/g, "")}Z`;
}

function escapeText(value: string): string {
  return value.replaceAll(/[\\;,]/g, (c) => `\\${c}`).replaceAll(/\r?\n/g, "\\n");
}

function fold(line: string): string {
  const parts: string[] = [];

  let part = "";

  for (const char of line) {
    const limit = parts.length === 0 ? FOLD_OCTETS : FOLD_OCTETS - 1;

    if (encoder.encode(part + char).length > limit) {
      parts.push(part);
      part = "";
    }

    part += char;
  }

  return [...parts, part].join(`${CRLF} `);
}
