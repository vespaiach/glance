import { copy } from "@/copy";
import { defaultEnd, defaultTimes, type EventTimes, moveStart } from "@/domain/eventTimes";
import type { CalendarEvent, Season, Tone } from "@/domain/schemas";
import { minutesOfDay } from "@/domain/time";
import type { TimeFixture } from "@/shell/SheetHost";

export type { TimeFixture };

export type EventDraft = EventTimes & {
  title: string;
  location: string;
  tone: Tone;
};

export type TimeFieldName = "start" | "end";

export type EventSheetState = {
  draft: EventDraft;
  picker: TimeFieldName | null;
  titleError: boolean;
  endError: boolean;
  confirming: boolean;
};

export type EventSheetAction =
  | { type: "title" | "location"; value: string }
  | { type: "tone"; value: Tone }
  | { type: "start" | "end"; value: number }
  | { type: "toggle"; field: TimeFieldName }
  | { type: "noEnd" }
  | { type: "done" }
  | { type: "askDelete" };

export type SwatchOption = { value: Tone; label: string };

export function draftFromEvent(event: CalendarEvent): EventDraft {
  const end = event.endAt === undefined ? {} : { end: minutesOfDay(new Date(event.endAt)) };

  return {
    title: event.title,
    start: minutesOfDay(new Date(event.startAt)),
    ...end,
    location: event.location ?? "",
    tone: event.tone,
  };
}

export function newEventDraft(now: Date): EventDraft {
  return { title: "", ...defaultTimes(now), location: "", tone: 1 };
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

export function initialEventSheet(draft: EventDraft, time?: TimeFixture): EventSheetState {
  const picker = time === "start" || time === "end" ? time : null;

  return {
    draft: fixtureDraft(draft, time),
    picker,
    titleError: false,
    endError: time === "error",
    confirming: false,
  };
}

function edited(state: EventSheetState, draft: EventDraft): EventSheetState {
  return { ...state, draft, titleError: false, endError: false };
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
    case "askDelete":
      return { ...state, confirming: true };
  }
}
