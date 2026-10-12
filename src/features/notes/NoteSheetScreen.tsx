"use client";

import { copy } from "@/copy";
import { useNote, useNotes, useNotesRepo } from "@/data/repos";
import type { Note } from "@/domain/schemas";
import { useKeyboardInset } from "@/shell/keyboard";
import { useNetwork } from "@/shell/providers/network";
import { useNow, useNowStore } from "@/shell/providers/now";
import { useSeason } from "@/shell/providers/season";
import { useAccountSettings } from "@/shell/providers/settings";
import { useSheetHost } from "@/shell/SheetHost";
import { NoteSheet } from "./components/NoteSheet";
import {
  draftFromNote,
  initialNoteSheet,
  type NoteBase,
  type NoteDraft,
  type NoteSheetState,
  newNoteBase,
  newNoteDraft,
  noteFromDraft,
  noteSwatches,
} from "./noteSheet";
import { noteStampText } from "./stamp";

type SheetFrameProps = {
  mode: "new" | "edit";
  eyebrow: string;
  initial: NoteSheetState;
  base: () => NoteBase;
  onDelete: () => void;
};

function SheetFrame({ mode, eyebrow, initial, base, onDelete }: SheetFrameProps) {
  const { close } = useSheetHost();

  const notes = useNotesRepo();

  const season = useSeason();

  const { online } = useNetwork();

  const onSave = (draft: NoteDraft) => {
    close();
    void notes.put(noteFromDraft(draft, base()));
  };

  return (
    <NoteSheet
      mode={mode}
      eyebrow={eyebrow}
      initial={initial}
      swatches={noteSwatches(season)}
      offline={!online}
      onClose={close}
      onDelete={onDelete}
      onSave={onSave}
      keyboardInset={useKeyboardInset()}
    />
  );
}

function EditNoteSheet({ note }: { note: Note }) {
  const { close } = useSheetHost();

  const notes = useNotesRepo();

  const { clock } = useAccountSettings();

  const now = useNow("minute");

  const onDelete = () => {
    close();
    void notes.remove(note.id);
  };

  return (
    <SheetFrame
      mode="edit"
      eyebrow={copy.notes.sheet.eyebrow(note.author, noteStampText(note, now, clock))}
      initial={initialNoteSheet(draftFromNote(note))}
      base={() => note}
      onDelete={onDelete}
    />
  );
}

function LoadedNoteSheet({ id }: { id: string }) {
  const note = useNote(id);

  return note ? <EditNoteSheet note={note} /> : null;
}

function NewNoteSheet({ draft }: { draft?: Pick<NoteDraft, "text" | "tone"> }) {
  const nowStore = useNowStore();

  const shown = useNotes(useNow("minute"));

  return (
    <SheetFrame
      mode="new"
      eyebrow={copy.notes.board}
      initial={initialNoteSheet(newNoteDraft(draft))}
      base={() => newNoteBase(nowStore.get(), shown?.length ?? 0)}
      onDelete={() => {}}
    />
  );
}

export function NoteSheetScreen() {
  const { sheet } = useSheetHost();

  if (sheet?.kind === "note") return <LoadedNoteSheet key={sheet.id} id={sheet.id} />;

  if (sheet?.kind === "newnote") return <NewNoteSheet draft={sheet.draft} />;

  return null;
}
