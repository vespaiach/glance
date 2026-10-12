import { copy } from "@/copy";
import type { Note, NoteTone, Season } from "@/domain/schemas";

export type NoteDraft = {
  text: string;
  author: string;
  tone: NoteTone;
};

export type NoteSheetState = {
  draft: NoteDraft;
  confirming: boolean;
};

export type NoteSheetAction =
  | { type: "text" | "author"; value: string }
  | { type: "tone"; value: NoteTone }
  | { type: "askDelete" };

export type NoteSwatchOption = { value: NoteTone; label: string };

const BLANK: NoteDraft = { text: "", author: "", tone: 1 };

export function draftFromNote(note: Pick<Note, "text" | "author" | "tone">): NoteDraft {
  return { text: note.text, author: note.author, tone: note.tone };
}

export function newNoteDraft(fixture?: Pick<NoteDraft, "text" | "tone">): NoteDraft {
  return { ...BLANK, ...fixture };
}

export function noteSwatches(season: Season): NoteSwatchOption[] {
  const [one, two, three, four, soft] = copy.events.swatches[season];

  return [
    { value: 1, label: one },
    { value: 2, label: two },
    { value: 3, label: three },
    { value: 4, label: four },
    { value: "soft", label: soft },
  ];
}

export function initialNoteSheet(draft: NoteDraft): NoteSheetState {
  return { draft, confirming: false };
}

export function noteSheetReducer(state: NoteSheetState, action: NoteSheetAction): NoteSheetState {
  switch (action.type) {
    case "text":
    case "author":
      return { ...state, draft: { ...state.draft, [action.type]: action.value } };
    case "tone":
      return { ...state, draft: { ...state.draft, tone: action.value } };
    case "askDelete":
      return { ...state, confirming: true };
  }
}
