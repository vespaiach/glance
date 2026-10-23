import { uuidv7 } from "@/domain/id";
import { noteTilt } from "@/domain/notes";
import type { Note } from "@/domain/schemas";

export type NoteDraft = {
  text: string;
  author: string;
};

export type NoteEditFields = {
  draft: NoteDraft;
  opened: NoteDraft;
  textError: boolean;
  fromDetails: boolean;
};

export type NoteViewState = { step: "details" | "deleting"; opened: NoteDraft };

export type NoteSheetState =
  | NoteViewState
  | (NoteEditFields & { step: "editing" })
  | (NoteEditFields & { step: "discarding"; discardTo: "details" | null });

export type NoteEditState = Exclude<NoteSheetState, NoteViewState>;

export type NoteSheetOptions = {
  opened?: NoteDraft;
  discard?: boolean;
  details?: boolean;
};

export type NoteBase = Pick<Note, "id" | "createdAt" | "rotation">;

export type NoteSheetAction =
  | { type: "text" | "author"; value: string }
  | { type: "save" }
  | { type: "askDelete" }
  | { type: "askDiscard"; to?: "details" }
  | { type: "keepEditing" }
  | { type: "edit" }
  | { type: "back" }
  | { type: "saved" };

const BLANK: NoteDraft = { text: "", author: "" };

export function draftFromNote(note: Pick<Note, "text" | "author">): NoteDraft {
  return { text: note.text, author: note.author };
}

export function noteFromDraft(draft: NoteDraft, { id, createdAt, rotation }: NoteBase): Note {
  return { id, createdAt, rotation, text: draft.text.trim(), author: draft.author.trim() };
}

export function newNoteBase(now: Date, noteCount: number): NoteBase {
  return { id: uuidv7(now), createdAt: now.toISOString(), rotation: noteTilt(noteCount) };
}

export function canSave(draft: NoteDraft): boolean {
  return draft.text.trim() !== "";
}

export function newNoteDraft(prefill?: Partial<NoteDraft>): NoteDraft {
  return { ...BLANK, ...prefill };
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
  return draft.text.trim() !== opened.text.trim() || draft.author.trim() !== opened.author.trim();
}

export function isViewing(state: NoteSheetState): state is NoteViewState {
  return state.step === "details" || state.step === "deleting";
}

export function noteSheetReducer(state: NoteSheetState, action: NoteSheetAction): NoteSheetState {
  if (isViewing(state)) return viewReducer(state, action);

  return editReducer(state, action);
}

function viewReducer(state: NoteViewState, action: NoteSheetAction): NoteSheetState {
  if (action.type === "edit") return editFromDetails(state);

  if (action.type === "askDelete") return { step: "deleting", opened: state.opened };

  return state;
}

function editReducer(state: NoteEditState, action: NoteSheetAction): NoteSheetState {
  switch (action.type) {
    case "text":
    case "author":
      return {
        ...edited(state, { ...state.draft, [action.type]: action.value }),
        textError: false,
      };
    case "save":
      return { ...state, textError: !canSave(state.draft) };
    case "askDiscard":
      return { ...editFields(state), step: "discarding", discardTo: action.to ?? null };
    case "keepEditing":
      return { ...editFields(state), step: "editing" };
    case "askDelete":
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
  return { ...editFields(state), draft, step: "editing" };
}
