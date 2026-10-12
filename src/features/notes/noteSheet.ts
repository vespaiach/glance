import { copy } from "@/copy";
import { uuidv7 } from "@/domain/id";
import { noteTilt } from "@/domain/notes";
import type { Note, NoteTone, Season } from "@/domain/schemas";

export type NoteDraft = {
  text: string;
  author: string;
  tone: NoteTone;
};

export type NoteSheetState = {
  draft: NoteDraft;
  textError: boolean;
  confirming: boolean;
};

export type NoteBase = Pick<Note, "id" | "createdAt" | "rotation">;

export type NoteSheetAction =
  | { type: "text" | "author"; value: string }
  | { type: "tone"; value: NoteTone }
  | { type: "save" }
  | { type: "askDelete" };

export type NoteSwatchOption = { value: NoteTone; label: string };

const BLANK: NoteDraft = { text: "", author: "", tone: 1 };

export function draftFromNote(note: Pick<Note, "text" | "author" | "tone">): NoteDraft {
  return { text: note.text, author: note.author, tone: note.tone };
}

export function noteFromDraft(draft: NoteDraft, { id, createdAt, rotation }: NoteBase): Note {
  const author = draft.author.trim();

  return {
    id,
    createdAt,
    rotation,
    text: draft.text.trim(),
    author: author === "" ? copy.notes.guestAuthor : author,
    tone: draft.tone,
  };
}

export function newNoteBase(now: Date, noteCount: number): NoteBase {
  return { id: uuidv7(now), createdAt: now.toISOString(), rotation: noteTilt(noteCount) };
}

export function canSave(draft: NoteDraft): boolean {
  return draft.text.trim() !== "";
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
  return { draft, textError: false, confirming: false };
}

export function noteSheetReducer(state: NoteSheetState, action: NoteSheetAction): NoteSheetState {
  switch (action.type) {
    case "text":
    case "author":
      return { ...state, draft: { ...state.draft, [action.type]: action.value }, textError: false };
    case "tone":
      return { ...state, draft: { ...state.draft, tone: action.value } };
    case "save":
      return { ...state, textError: !canSave(state.draft) };
    case "askDelete":
      return { ...state, confirming: true };
  }
}
