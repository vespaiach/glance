import { copy } from "@/copy";
import {
  defaultEnd,
  defaultTimes,
  type EventTimes,
  endsAfterStart,
  moveStart,
} from "@/domain/eventTimes";
import type { CalendarEvent, Season, Tone } from "@/domain/schemas";
import { atMinute, minutesOfDay } from "@/domain/time";
import type { TimeFixture } from "@/shell/SheetHost";
import { afterEdit, type SheetConfirm } from "@/ui/discard";

export type { TimeFixture };

export type EventDraft = EventTimes & {
  title: string;
  location: string;
  tone: Tone;
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
  | { type: "tone"; value: Tone }
  | { type: "start" | "end"; value: number }
  | { type: "toggle"; field: TimeFieldName }
  | { type: "noEnd" }
  | { type: "done" }
  | { type: "save" }
  | { type: "askDelete" }
  | { type: "askDiscard" }
  | { type: "keepEditing" };

export type SwatchOption = { value: Tone; label: string };

export function draftFromEvent(event: CalendarEvent, tz: string): EventDraft {
  const end = event.endAt === undefined ? {} : { end: minutesOfDay(new Date(event.endAt), tz) };

  return {
    title: event.title,
    start: minutesOfDay(new Date(event.startAt), tz),
    ...end,
    location: event.location ?? "",
    tone: event.tone,
  };
}

export function eventFromDraft(
  draft: EventDraft,
  dayKey: string,
  id: string,
  tz: string,
): CalendarEvent {
  const location = draft.location.trim();

  const end =
    draft.end === undefined ? {} : { endAt: atMinute(dayKey, draft.end, tz).toISOString() };

  return {
    id,
    title: draft.title.trim(),
    startAt: atMinute(dayKey, draft.start, tz).toISOString(),
    ...end,
    ...(location === "" ? {} : { location }),
    tone: draft.tone,
  };
}

export function newEventDraft(now: Date, tz: string): EventDraft {
  return { title: "", ...defaultTimes(now, tz), location: "", tone: 1 };
}

export function eventSwatches(season: Season): SwatchOption[] {
  const [one, two, three, four, soft] = copy.events.swatches[season];

  return [
    { value: 1, label: one },
    { value: 2, label: two },
    { value: 3, label: three },
    { value: 4, label: four },
    { value: "soft", label: soft },
    { value: "accent", label: copy.events.alert },
  ];
}

function withoutEnd({ end: _, ...draft }: EventDraft): EventDraft {
  return draft;
}

function fixtureDraft(draft: EventDraft, time?: TimeFixture): EventDraft {
  if (time === "error") return { ...draft, end: draft.start - 30 };

  return time === "noend" ? withoutEnd(draft) : draft;
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
    draft.tone !== opened.tone
  );
}

function saveErrors(draft: EventDraft) {
  return { titleError: draft.title.trim() === "", endError: !endsAfterStart(draft) };
}

export function canSave(draft: EventDraft): boolean {
  const { titleError, endError } = saveErrors(draft);

  return !titleError && !endError;
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

export function eventSheetReducer(
  state: EventSheetState,
  action: EventSheetAction,
): EventSheetState {
  const { draft } = state;

  switch (action.type) {
    case "title":
    case "location":
      return edited(state, { ...draft, [action.type]: action.value });
    case "tone":
      return edited(state, { ...draft, tone: action.value });
    case "start":
      return edited(state, { ...draft, ...moveStart(draft, action.value) });
    case "end":
      return edited(state, { ...draft, end: action.value });
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
