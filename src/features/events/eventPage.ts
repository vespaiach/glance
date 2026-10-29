import { type DefaultWord, type EventWord, nextWord } from "@/domain/eventSentence";
import { defaultEnd, endForLength, moveStart, pickEnd } from "@/domain/eventTimes";
import { type EventDraft, isDirty } from "./eventDraft";

export type PageDraft = EventDraft & { day: string };

export type Asking = "none" | "discard" | "delete";

export type EventPageFields = {
  draft: PageDraft;
  opened: PageDraft;
  word: EventWord;
  touched: readonly DefaultWord[];
  asking: Asking;
  fromDetails: boolean;
};

export type EventPageMode = "new" | "edit" | "view";

export type EventPageState =
  | { mode: "view"; opened: PageDraft }
  | (EventPageFields & { mode: "new" | "edit" })
  | { mode: "closed" };

export type EventPageEditState = Extract<EventPageState, { mode: "new" | "edit" }>;

export type OpenEventPage = Exclude<EventPageState, { mode: "closed" }>;

export type EventPageAction =
  | { type: "select"; word: EventWord }
  | { type: "next" }
  | { type: "title" | "location" | "notes" | "day"; value: string }
  | { type: "start" | "end"; value: number }
  | { type: "length"; minutes: number }
  | { type: "noEnd" }
  | { type: "addEnd" }
  | { type: "allDay" | "notify" | "repeat"; value: boolean }
  | { type: "who"; tagIds: string[] }
  | { type: "close" }
  | { type: "keepEditing" }
  | { type: "discard" }
  | { type: "askDelete" }
  | { type: "keep" }
  | { type: "deleted" }
  | { type: "saved" }
  | { type: "edit"; word: EventWord; ended: boolean };

const ALL_SET: readonly DefaultWord[] = ["day", "start", "end", "who"];

const CLOSED: EventPageState = { mode: "closed" };

export function initialEventPage(
  mode: EventPageMode,
  draft: PageDraft,
  word: EventWord = "title",
): EventPageState {
  if (mode === "view") return { mode, opened: draft };

  return editState(mode, draft, word, false);
}

export function canSave(draft: Pick<PageDraft, "title">): boolean {
  return draft.title.trim() !== "";
}

export function isPageDirty({ draft, opened }: EventPageFields): boolean {
  return draft.day !== opened.day || isDirty(draft, opened);
}

export function eventPageReducer(state: EventPageState, action: EventPageAction): EventPageState {
  if (state.mode === "closed") return state;

  if (state.mode === "view") return viewReducer(state, action);

  return editReducer(state, action);
}

function viewReducer(
  state: Extract<EventPageState, { mode: "view" }>,
  action: EventPageAction,
): EventPageState {
  if (action.type === "close") return CLOSED;

  if (action.type !== "edit" || action.ended) return state;

  return editState("edit", state.opened, action.word, true);
}

function editReducer(state: EventPageEditState, action: EventPageAction): EventPageState {
  const { draft } = state;

  switch (action.type) {
    case "select":
      return atWord(state, action.word);
    case "next":
      return atWord(state, nextWord(state.word, wordShape(draft)) ?? state.word);
    case "title":
    case "location":
    case "notes":
      return edited(state, { ...draft, [action.type]: action.value });
    case "day":
      return touch(edited(state, { ...draft, day: action.value }), "day");
    case "start":
      return touch(edited(state, { ...draft, ...moveStart(draft, action.value) }), "start");
    case "end":
      return touch(edited(state, { ...draft, end: pickEnd(draft.start, action.value) }), "end");
    case "length":
      return touch(
        edited(state, { ...draft, end: endForLength(draft.start, action.minutes) }),
        "end",
      );
    case "noEnd":
      return atWord(edited(state, withoutEnd(draft)), "who");
    case "addEnd":
      return atWord(edited(state, { ...draft, end: defaultEnd(draft.start) }), "end");
    case "allDay":
      return edited(state, withAllDay(draft, action.value));
    case "notify":
      return edited(state, { ...draft, notify: action.value });
    case "repeat":
      return touch(edited(state, withRepeat(draft, action.value)), "day");
    case "who":
      return touch(edited(state, { ...draft, tagIds: action.tagIds }), "who");
    case "close":
      return isPageDirty(state) ? { ...state, asking: "discard" } : leave(state);
    case "keepEditing":
    case "keep":
      return { ...state, asking: "none" };
    case "discard":
      return leave(state);
    case "askDelete":
      return state.mode === "edit" ? { ...state, asking: "delete" } : state;
    case "deleted":
      return CLOSED;
    case "saved":
      return state.fromDetails ? { mode: "view", opened: draft } : CLOSED;
    case "edit":
      return state;
  }
}

function editState(
  mode: "new" | "edit",
  draft: PageDraft,
  word: EventWord,
  fromDetails: boolean,
): EventPageEditState {
  const touched = mode === "edit" ? ALL_SET : [];

  return { mode, draft, opened: draft, word, touched, asking: "none", fromDetails };
}

function atWord(state: EventPageEditState, word: EventWord): EventPageEditState {
  return touch({ ...state, word }, word);
}

function touch(state: EventPageEditState, word: EventWord): EventPageEditState {
  if (!isDefaultWord(word) || state.touched.includes(word)) return state;

  return { ...state, touched: [...state.touched, word] };
}

function isDefaultWord(word: EventWord): word is DefaultWord {
  return (ALL_SET as readonly EventWord[]).includes(word);
}

function edited(state: EventPageEditState, draft: PageDraft): EventPageEditState {
  return { ...state, draft, asking: state.asking === "discard" ? "none" : state.asking };
}

function leave(state: EventPageEditState): EventPageState {
  return state.fromDetails ? { mode: "view", opened: state.opened } : CLOSED;
}

function wordShape(draft: PageDraft) {
  return { allDay: draft.allDay, hasEnd: draft.end !== undefined };
}

function withoutEnd({ end: _, ...draft }: PageDraft): PageDraft {
  return draft;
}

function withAllDay({ allDay: _, ...draft }: PageDraft, allDay: boolean): PageDraft {
  return allDay ? { ...draft, allDay: true } : draft;
}

function withRepeat({ repeat: _, ...draft }: PageDraft, weekly: boolean): PageDraft {
  return weekly ? { ...draft, repeat: "weekly" } : draft;
}
