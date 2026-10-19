import { allDayStart } from "@/domain/allDay";
import {
  defaultEnd,
  defaultTimes,
  type EventTimes,
  endsAfterStart,
  moveStart,
} from "@/domain/eventTimes";
import type { CalendarEvent } from "@/domain/schemas";
import { atMinute, minutesOfDay } from "@/domain/time";
import type { TimeFixture } from "@/shell/SheetHost";
import { afterEdit, type SheetConfirm } from "@/ui/discard";

export type { TimeFixture };

export type EventDraft = EventTimes & {
  title: string;
  location: string;
  everyone: boolean;
  memberIds: string[];
  notes: string;
  allDay?: true;
};

export type TimeFieldName = "start" | "end";

export type EventSheetState = {
  draft: EventDraft;
  opened: EventDraft;
  picker: TimeFieldName | null;
  titleError: boolean;
  endError: boolean;
  confirm: SheetConfirm;
};

export type EventSheetAction =
  | { type: "title" | "location"; value: string }
  | { type: "start" | "end"; value: number }
  | { type: "allDay"; value: boolean }
  | { type: "toggle"; field: TimeFieldName }
  | { type: "noEnd" }
  | { type: "done" }
  | { type: "save" }
  | { type: "askDelete" }
  | { type: "askDiscard" }
  | { type: "keepEditing" };

export function draftFromEvent(event: CalendarEvent, tz: string, now: Date): EventDraft {
  return {
    title: event.title,
    ...eventTimes(event, tz, now),
    location: event.location ?? "",
    everyone: event.everyone,
    memberIds: event.memberIds,
    notes: event.notes ?? "",
  };
}

export function eventFromDraft(
  draft: EventDraft,
  dayKey: string,
  id: string,
  tz: string,
): CalendarEvent {
  const location = draft.location.trim();

  const notes = draft.notes.trim();

  return {
    id,
    title: draft.title.trim(),
    ...eventSpan(draft, dayKey, tz),
    ...(location === "" ? {} : { location }),
    everyone: draft.everyone,
    memberIds: draft.memberIds,
    ...(notes === "" ? {} : { notes }),
  };
}

export function newEventDraft(now: Date, tz: string): EventDraft {
  return {
    title: "",
    ...defaultTimes(now, tz),
    location: "",
    everyone: true,
    memberIds: [],
    notes: "",
  };
}

export function initialEventSheet(
  draft: EventDraft,
  time?: TimeFixture,
  discard = false,
): EventSheetState {
  const opened = fixtureDraft(draft, time);

  const picker = time === "start" || time === "end" ? time : null;

  return {
    draft: opened,
    opened,
    picker: discard ? null : picker,
    titleError: false,
    endError: time === "error",
    confirm: discard ? "discard" : null,
  };
}

export function isDirty(draft: EventDraft, opened: EventDraft): boolean {
  return (
    draft.title.trim() !== opened.title.trim() ||
    draft.location.trim() !== opened.location.trim() ||
    draft.start !== opened.start ||
    draft.end !== opened.end ||
    draft.allDay !== opened.allDay
  );
}

export function canSave(draft: EventDraft): boolean {
  const { titleError, endError } = saveErrors(draft);

  return !titleError && !endError;
}

export function eventSheetReducer(
  state: EventSheetState,
  action: EventSheetAction,
): EventSheetState {
  const { draft } = state;

  switch (action.type) {
    case "title":
    case "location":
      return edited(state, { ...draft, [action.type]: action.value });
    case "start":
      return edited(state, { ...draft, ...moveStart(draft, action.value) });
    case "end":
      return edited(state, { ...draft, end: action.value });
    case "allDay":
      return { ...edited(state, withAllDay(draft, action.value)), picker: null };
    case "toggle":
      return toggled(state, action.field);
    case "noEnd":
      return { ...edited(state, withoutEnd(draft)), picker: null };
    case "done":
      return { ...state, picker: null };
    case "save":
      return failedSave(state);
    case "askDelete":
      return { ...state, confirm: "delete" };
    case "askDiscard":
      return { ...state, confirm: "discard", picker: null };
    case "keepEditing":
      return { ...state, confirm: null };
  }
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

function withAllDay({ allDay: _, ...draft }: EventDraft, allDay: boolean): EventDraft {
  return allDay ? { ...draft, allDay: true } : draft;
}

function withoutEnd({ end: _, ...draft }: EventDraft): EventDraft {
  return draft;
}

function fixtureDraft(draft: EventDraft, time?: TimeFixture): EventDraft {
  if (time === "error") return { ...draft, end: draft.start - 30 };

  return time === "noend" ? withoutEnd(draft) : draft;
}

function saveErrors(draft: EventDraft) {
  return {
    titleError: draft.title.trim() === "",
    endError: !draft.allDay && !endsAfterStart(draft),
  };
}

function failedSave(state: EventSheetState): EventSheetState {
  const errors = saveErrors(state.draft);

  return { ...state, ...errors, picker: errors.endError ? null : state.picker };
}

function edited(state: EventSheetState, draft: EventDraft): EventSheetState {
  return { ...state, draft, titleError: false, endError: false, confirm: afterEdit(state.confirm) };
}

function toggled(state: EventSheetState, field: TimeFieldName): EventSheetState {
  if (state.picker === field) return { ...state, picker: null };

  const { draft } = state;

  const filled = field === "end" && draft.end === undefined;

  return {
    ...(filled ? edited(state, { ...draft, end: defaultEnd(draft.start) }) : state),
    picker: field,
  };
}
