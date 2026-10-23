"use client";

import { type ShownNote, useLastAuthor, useNote, useNotes, useNotesRepo } from "@/data/repos";
import { useBreakpoint } from "@/shell/breakpoint";
import { useKeyboardInset } from "@/shell/keyboard";
import { useNetwork } from "@/shell/providers/network";
import { useNow, useNowStore } from "@/shell/providers/now";
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
} from "./noteSheet";
import { noteStampText } from "./stamp";

type SheetFrameProps = {
  mode: "new" | "edit";
  initial: NoteSheetState;
  base: () => NoteBase;
  time?: string;
  onDelete: () => void;
};

type LoadedProps = { id: string; discard?: true; edit?: true };

type NewNoteProps = { draft?: Pick<NoteDraft, "text">; discard?: true };

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

function SheetFrame({ mode, initial, base, time, onDelete }: SheetFrameProps) {
  const { close } = useSheetHost();

  const notes = useNotesRepo();

  const { online } = useNetwork();

  const onSave = (draft: NoteDraft) => {
    const note = noteFromDraft(draft, base());

    void (mode === "new" ? notes.post(note) : notes.put(note));
  };

  return (
    <NoteSheet
      mode={mode}
      initial={initial}
      offline={!online}
      breakpoint={useBreakpoint()}
      onClose={close}
      onDelete={onDelete}
      onSave={onSave}
      time={time}
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
      initial={initialNoteSheet(draftFromNote(note), { discard, details: !edit })}
      base={() => note}
      time={time}
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

  const author = useLastAuthor();

  if (author === undefined) return null;

  const opened = newNoteDraft({ author });

  return (
    <SheetFrame
      mode="new"
      initial={initialNoteSheet({ ...opened, ...draft }, { opened, discard })}
      base={() => newNoteBase(nowStore.get(), shown?.length ?? 0)}
      onDelete={() => {}}
    />
  );
}
