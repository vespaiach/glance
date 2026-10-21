import { copy } from "@/copy";
import { uuidv7 } from "@/domain/id";
import { noteTilt } from "@/domain/notes";
import type { Note, NoteTone, Season } from "@/domain/schemas";

export type NoteDraft = {
  text: string;
  author: string;
  tone: NoteTone;
};

export type NoteEditFields = {
  draft: NoteDraft;
  opened: NoteDraft;
  textError: boolean;
  fromDetails: boolean;
};

export type NoteSheetState =
  | { step: "details"; opened: NoteDraft }
  | (NoteEditFields & { step: "editing" | "deleting" })
  | (NoteEditFields & { step: "discarding"; discardTo: "details" | null });

export type NoteEditState = Exclude<NoteSheetState, { step: "details" }>;

export type NoteSheetOptions = {
  opened?: NoteDraft;
  discard?: boolean;
  details?: boolean;
};

export type NoteBase = Pick<Note, "id" | "createdAt" | "rotation">;

export type NoteSheetAction =
  | { type: "text" | "author"; value: string }
  | { type: "tone"; value: NoteTone }
  | { type: "save" }
  | { type: "askDelete" }
  | { type: "askDiscard"; to?: "details" }
  | { type: "keepEditing" }
  | { type: "edit" }
  | { type: "back" }
  | { type: "saved" };

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
  { opened = draft, discard = false, details = false }: NoteSheetOptions = {},
): NoteSheetState {
  if (details && !discard) return { step: "details", opened };

  const fields: NoteEditFields = { draft, opened, textError: false, fromDetails: details };

  if (discard) return { ...fields, step: "discarding", discardTo: details ? "details" : null };

  return { ...fields, step: "editing" };
}

export function isDirty(draft: NoteDraft, opened: NoteDraft): boolean {
  return (
    draft.text.trim() !== opened.text.trim() ||
    draft.author.trim() !== opened.author.trim() ||
    draft.tone !== opened.tone
  );
}

export function noteSheetReducer(state: NoteSheetState, action: NoteSheetAction): NoteSheetState {
  if (state.step === "details") return action.type === "edit" ? editFromDetails(state) : state;

  return editReducer(state, action);
}

function editReducer(state: NoteEditState, action: NoteSheetAction): NoteSheetState {
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
      return { ...editFields(state), step: "deleting" };
    case "askDiscard":
      return { ...editFields(state), step: "discarding", discardTo: action.to ?? null };
    case "keepEditing":
      return { ...editFields(state), step: "editing" };
    case "edit":
      return state;
    case "back":
      return { step: "details", opened: state.opened };
    case "saved":
      return { step: "details", opened: state.draft };
  }
}

function editFromDetails({ opened }: { opened: NoteDraft }): NoteEditState {
  return { step: "editing", draft: opened, opened, textError: false, fromDetails: true };
}

function editFields({ draft, opened, textError, fromDetails }: NoteEditState): NoteEditFields {
  return { draft, opened, textError, fromDetails };
}

function edited(state: NoteEditState, draft: NoteDraft): NoteEditState {
  const step = state.step === "deleting" ? "deleting" : "editing";

  return { ...editFields(state), draft, step };
}
