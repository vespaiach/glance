"use client";

import { copy } from "@/copy";
import { type ShownNote, useNote, useNotes, useNotesRepo } from "@/data/repos";
import { useKeyboardInset } from "@/shell/keyboard";
import { useNetwork } from "@/shell/providers/network";
import { useNow, useNowStore } from "@/shell/providers/now";
import { useSeason } from "@/shell/providers/season";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
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
  time?: string;
  rotation?: number;
  onDelete: () => void;
};

type LoadedProps = { id: string; discard?: true; edit?: true };

type NewNoteProps = { draft?: Pick<NoteDraft, "text" | "tone">; discard?: true };

export function NoteSheetScreen() {
  const { sheet } = useSheetHost();

  if (sheet?.kind === "note")
    return (
      <LoadedNoteSheet key={sheet.id} id={sheet.id} discard={sheet.discard} edit={sheet.edit} />
    );

  if (sheet?.kind === "newnote")
    return <NewNoteSheet draft={sheet.draft} discard={sheet.discard} />;

  return null;
}

function SheetFrame({ mode, eyebrow, initial, base, time, rotation, onDelete }: SheetFrameProps) {
  const { close } = useSheetHost();

  const notes = useNotesRepo();

  const season = useSeason();

  const { online } = useNetwork();

  const onSave = (draft: NoteDraft) => {
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
      time={time}
      rotation={rotation}
      keyboardInset={useKeyboardInset()}
    />
  );
}

function EditNoteSheet({ note, discard, edit }: { note: ShownNote } & Omit<LoadedProps, "id">) {
  const { close } = useSheetHost();

  const notes = useNotesRepo();

  const { clock } = useAccountSettings();

  const now = useNow("minute");

  const tz = useTimeZone();

  const time = noteStampText(note, now, clock, tz);

  const onDelete = () => {
    close();
    void notes.remove(note.id);
  };

  return (
    <SheetFrame
      mode="edit"
      eyebrow={copy.notes.sheet.eyebrow(note.author, time)}
      initial={initialNoteSheet(draftFromNote(note), { discard, details: !edit })}
      base={() => note}
      time={time}
      rotation={note.rotation}
      onDelete={onDelete}
    />
  );
}

function LoadedNoteSheet({ id, discard, edit }: LoadedProps) {
  const note = useNote(id);

  return note ? <EditNoteSheet note={note} discard={discard} edit={edit} /> : null;
}

function NewNoteSheet({ draft, discard }: NewNoteProps) {
  const nowStore = useNowStore();

  const shown = useNotes(useNow("minute"));

  return (
    <SheetFrame
      mode="new"
      eyebrow={copy.notes.board}
      initial={initialNoteSheet(newNoteDraft(draft), { opened: newNoteDraft(), discard })}
      base={() => newNoteBase(nowStore.get(), shown?.length ?? 0)}
      onDelete={() => {}}
    />
  );
}
