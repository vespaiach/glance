import { allDayStart } from "@/domain/allDay";
import {
  defaultEnd,
  defaultTimes,
  type EventTimes,
  endsAfterStart,
  moveStart,
} from "@/domain/eventTimes";
import { EVERYONE, type EventWho, toggleWho, whoFromFilter } from "@/domain/members";
import type { CalendarEvent } from "@/domain/schemas";
import { atMinute, minutesOfDay } from "@/domain/time";
import type { TimeFixture } from "@/shell/SheetHost";

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

export type EventEditFields = {
  draft: EventDraft;
  opened: EventDraft;
  picker: TimeFieldName | null;
  titleError: boolean;
  endError: boolean;
  fromDetails: boolean;
};

export type EventSheetState =
  | { step: "details"; opened: EventDraft }
  | (EventEditFields & { step: "editing" | "deleting" })
  | (EventEditFields & { step: "discarding"; discardTo: "details" | null });

export type EventEditState = Exclude<EventSheetState, { step: "details" }>;

export type EventSheetAction =
  | { type: "title" | "location" | "notes"; value: string }
  | { type: "member"; id: string; family: readonly string[] }
  | { type: "everyone" }
  | { type: "start" | "end"; value: number }
  | { type: "allDay"; value: boolean }
  | { type: "toggle"; field: TimeFieldName }
  | { type: "noEnd" }
  | { type: "done" }
  | { type: "save" }
  | { type: "askDelete" }
  | { type: "askDiscard"; to?: "details" }
  | { type: "keepEditing" }
  | { type: "edit" }
  | { type: "back" }
  | { type: "saved" };

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

export function newEventDraft(
  now: Date,
  tz: string,
  memberIds?: readonly string[],
  times: EventTimes = defaultTimes(now, tz),
): EventDraft {
  return {
    title: "",
    ...times,
    location: "",
    ...draftWho(whoFromFilter(memberIds)),
    notes: "",
  };
}

export function initialEventSheet(
  draft: EventDraft,
  time?: TimeFixture,
  discard = false,
  details = false,
): EventSheetState {
  const opened = fixtureDraft(draft, time);

  if (details && !discard) return { step: "details", opened };

  const fields: EventEditFields = {
    draft: opened,
    opened,
    picker: discard || details ? null : fixturePicker(time),
    titleError: false,
    endError: time === "error",
    fromDetails: details,
  };

  if (discard) return { ...fields, step: "discarding", discardTo: details ? "details" : null };

  return { ...fields, step: "editing" };
}

export function isDirty(draft: EventDraft, opened: EventDraft): boolean {
  return (
    draft.title.trim() !== opened.title.trim() ||
    draft.location.trim() !== opened.location.trim() ||
    draft.notes.trim() !== opened.notes.trim() ||
    !sameWho(draft, opened) ||
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
  if (state.step === "details") return action.type === "edit" ? editFromDetails(state) : state;

  return editReducer(state, action);
}

function editReducer(state: EventEditState, action: EventSheetAction): EventSheetState {
  const { draft } = state;

  switch (action.type) {
    case "title":
    case "location":
    case "notes":
      return edited(state, { ...draft, [action.type]: action.value });
    case "member":
      return withWho(state, toggleWho(draft, action.id, action.family));
    case "everyone":
      return withWho(state, EVERYONE);
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
      return { ...editFields(state), step: "deleting" };
    case "askDiscard":
      return {
        ...editFields(state),
        picker: null,
        step: "discarding",
        discardTo: action.to ?? null,
      };
    case "keepEditing":
      return { ...editFields(state), step: "editing" };
    case "edit":
      return state;
    case "back":
      return { step: "details", opened: state.opened };
    case "saved":
      return { step: "details", opened: draft };
  }
}

function editFromDetails({ opened }: { opened: EventDraft }): EventEditState {
  return {
    step: "editing",
    draft: opened,
    opened,
    picker: null,
    titleError: false,
    endError: false,
    fromDetails: true,
  };
}

function editFields(state: EventEditState): EventEditFields {
  const { draft, opened, picker, titleError, endError, fromDetails } = state;

  return { draft, opened, picker, titleError, endError, fromDetails };
}

function fixturePicker(time?: TimeFixture): TimeFieldName | null {
  return time === "start" || time === "end" ? time : null;
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

function withWho(state: EventEditState, who: EventWho): EventEditState {
  if (sameWho(who, state.draft)) return state;

  return edited(state, { ...state.draft, ...draftWho(who) });
}

function draftWho({ everyone, memberIds }: EventWho) {
  return { everyone, memberIds: [...memberIds] };
}

function sameWho(draft: EventWho, opened: EventWho): boolean {
  if (draft.everyone || opened.everyone) return draft.everyone === opened.everyone;

  return (
    draft.memberIds.length === opened.memberIds.length &&
    draft.memberIds.every((id) => opened.memberIds.includes(id))
  );
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

function failedSave(state: EventEditState): EventEditState {
  const errors = saveErrors(state.draft);

  return { ...state, ...errors, picker: errors.endError ? null : state.picker };
}

function edited(state: EventEditState, draft: EventDraft): EventEditState {
  const step = state.step === "deleting" ? "deleting" : "editing";

  return { ...editFields(state), draft, titleError: false, endError: false, step };
}

function toggled(state: EventEditState, field: TimeFieldName): EventEditState {
  if (state.picker === field) return { ...state, picker: null };

  const { draft } = state;

  const filled = field === "end" && draft.end === undefined;

  return {
    ...(filled ? edited(state, { ...draft, end: defaultEnd(draft.start) }) : state),
    picker: field,
  };
}
