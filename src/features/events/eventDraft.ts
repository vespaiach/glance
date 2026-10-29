import { allDayStart } from "@/domain/allDay";
import { defaultTimes, type EventTimes } from "@/domain/eventTimes";
import type { CalendarEvent } from "@/domain/schemas";
import { whoIds, whoValue } from "@/domain/tags";
import { atMinute, minutesOfDay } from "@/domain/time";

export type EventDraft = EventTimes & {
  title: string;
  location: string;
  tagIds: string[];
  notes: string;
  notify: boolean;
  allDay?: true;
  repeat?: "weekly";
};

export function draftFromEvent(
  event: CalendarEvent,
  tz: string,
  now: Date,
  allIds: readonly string[],
): EventDraft {
  return {
    title: event.title,
    ...eventTimes(event, tz, now),
    location: event.location ?? "",
    tagIds: [...whoIds(event, allIds)],
    notes: event.notes ?? "",
    notify: event.notify !== false,
    ...(event.repeat ? { repeat: event.repeat } : {}),
  };
}

export function eventFromDraft(
  draft: EventDraft,
  dayKey: string,
  id: string,
  tz: string,
  allIds: readonly string[],
): CalendarEvent {
  const location = draft.location.trim();

  const notes = draft.notes.trim();

  const who = whoValue(draft.tagIds, allIds);

  return {
    id,
    title: draft.title.trim(),
    ...eventSpan(draft, dayKey, tz),
    ...(location === "" ? {} : { location }),
    everyone: who.everyone,
    tagIds: [...who.tagIds],
    ...(notes === "" ? {} : { notes }),
    notify: draft.notify,
    ...(draft.repeat ? { repeat: draft.repeat } : {}),
  };
}

export function newEventDraft(
  now: Date,
  tz: string,
  tagIds: readonly string[],
  times: EventTimes = defaultTimes(now, tz),
): EventDraft {
  return {
    title: "",
    ...times,
    location: "",
    tagIds: [...tagIds],
    notes: "",
    notify: true,
  };
}

export function isDirty(draft: EventDraft, opened: EventDraft): boolean {
  return (
    draft.title.trim() !== opened.title.trim() ||
    draft.location.trim() !== opened.location.trim() ||
    draft.notes.trim() !== opened.notes.trim() ||
    !sameWho(draft.tagIds, opened.tagIds) ||
    draft.start !== opened.start ||
    draft.end !== opened.end ||
    draft.allDay !== opened.allDay ||
    draft.repeat !== opened.repeat ||
    draft.notify !== opened.notify
  );
}

function eventTimes(event: CalendarEvent, tz: string, now: Date): EventTimes & { allDay?: true } {
  if (event.allDay) return { ...defaultTimes(now, tz), allDay: true };

  const end = event.endAt === undefined ? {} : { end: minutesOfDay(new Date(event.endAt), tz) };

  return { start: minutesOfDay(new Date(event.startAt), tz), ...end };
}

function eventSpan(draft: EventDraft, dayKey: string, tz: string) {
  if (draft.allDay) return { startAt: allDayStart(dayKey), allDay: true as const };

  const end =
    draft.end === undefined ? {} : { endAt: atMinute(dayKey, draft.end, tz).toISOString() };

  return { startAt: atMinute(dayKey, draft.start, tz).toISOString(), ...end };
}

function sameWho(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}
