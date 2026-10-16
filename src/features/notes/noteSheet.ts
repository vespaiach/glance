import { copy } from "@/copy";
import { uuidv7 } from "@/domain/id";
import { noteTilt } from "@/domain/notes";
import type { Note, NoteTone, Season } from "@/domain/schemas";
import { afterEdit, type SheetConfirm } from "@/ui/discard";

export type NoteDraft = {
  text: string;
  author: string;
  tone: NoteTone;
};

export type NoteSheetState = {
  draft: NoteDraft;
  opened: NoteDraft;
  textError: boolean;
  confirm: SheetConfirm;
};

export type NoteSheetOptions = {
  opened?: NoteDraft;
  discard?: boolean;
};

export type NoteBase = Pick<Note, "id" | "createdAt" | "rotation">;

export type NoteSheetAction =
  | { type: "text" | "author"; value: string }
  | { type: "tone"; value: NoteTone }
  | { type: "save" }
  | { type: "askDelete" }
  | { type: "askDiscard" }
  | { type: "keepEditing" };

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

export function initialNoteSheet(
  draft: NoteDraft,
  { opened = draft, discard = false }: NoteSheetOptions = {},
): NoteSheetState {
  return { draft, opened, textError: false, confirm: discard ? "discard" : null };
}

export function isDirty(draft: NoteDraft, opened: NoteDraft): boolean {
  return (
    draft.text.trim() !== opened.text.trim() ||
    draft.author.trim() !== opened.author.trim() ||
    draft.tone !== opened.tone
  );
}

function edited(state: NoteSheetState, draft: NoteDraft): NoteSheetState {
  return { ...state, draft, confirm: afterEdit(state.confirm) };
}

export function noteSheetReducer(state: NoteSheetState, action: NoteSheetAction): NoteSheetState {
  switch (action.type) {
    case "text":
    case "author":
      return {
        ...edited(state, { ...state.draft, [action.type]: action.value }),
        textError: false,
      };
    case "tone":
      return edited(state, { ...state.draft, tone: action.value });
    case "save":
      return { ...state, textError: !canSave(state.draft) };
    case "askDelete":
      return { ...state, confirm: "delete" };
    case "askDiscard":
      return { ...state, confirm: "discard" };
    case "keepEditing":
      return { ...state, confirm: null };
  }
}
