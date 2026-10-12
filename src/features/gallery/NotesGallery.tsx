import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { copy } from "@/copy";
import type { Season } from "@/domain/schemas";
import {
  draftFromNote,
  initialNoteSheet,
  NoteBoard,
  NoteSheet,
  newNoteDraft,
  noteStampText,
  noteSwatches,
} from "@/features/notes";
import { Button } from "@/ui/Button";
import { GalleryGroup } from "./GalleryGroup";
import { BOARD_NOTES, gallery, NOW } from "./samples";

type Demo = {
  label: string;
  mode: "new" | "edit";
  draft?: boolean;
  offline?: boolean;
};

const words = gallery.noteSheet;

const DEMOS: readonly Demo[] = [
  { label: words.edit, mode: "edit" },
  { label: words.new, mode: "new" },
  { label: words.draft, mode: "new", draft: true },
  { label: words.offline, mode: "new", offline: true },
];

const WIFI = BOARD_NOTES[1];

const ignore = () => {};

const styles = stylex.create({
  view: {
    width: 1200,
  },
  phone: {
    width: 350,
  },
});

const board = {
  now: NOW,
  clock: "12h",
  retryIn: 2,
  onRetry: ignore,
  onOpenNote: ignore,
  onAddNote: ignore,
} as const;

function NoteSheetDemo({
  season,
  demo,
  onClose,
}: {
  season: Season;
  demo: Demo;
  onClose: () => void;
}) {
  const draft = demo.draft
    ? newNoteDraft({ text: gallery.input.notesValue, tone: 2 })
    : newNoteDraft();

  const edit = demo.mode === "edit" && WIFI;

  return (
    <NoteSheet
      mode={demo.mode}
      eyebrow={
        edit
          ? copy.notes.sheet.eyebrow(edit.author, noteStampText(edit, NOW, "12h"))
          : copy.notes.board
      }
      initial={initialNoteSheet(edit ? draftFromNote(edit) : draft)}
      swatches={noteSwatches(season)}
      offline={demo.offline ?? false}
      onClose={onClose}
      onDelete={onClose}
      onSave={onClose}
    />
  );
}

export function NotesGallery({ season }: { season: Season }) {
  const [open, setOpen] = useState<Demo | null>(null);

  return (
    <>
      <GalleryGroup title={gallery.groups.notesView}>
        <div {...stylex.props(styles.view)}>
          <NoteBoard state={{ kind: "ready", data: BOARD_NOTES }} expiry="1w" {...board} />
        </div>
        <div {...stylex.props(styles.view)}>
          <NoteBoard state={{ kind: "empty" }} expiry="1w" {...board} />
        </div>
        <div {...stylex.props(styles.view)}>
          <NoteBoard state={{ kind: "empty" }} expiry={null} {...board} />
        </div>
        <div {...stylex.props(styles.view)}>
          <NoteBoard state={{ kind: "loading" }} expiry="1w" {...board} />
        </div>
        <div {...stylex.props(styles.view)}>
          <NoteBoard state={{ kind: "failed" }} expiry="1w" {...board} />
        </div>
        <div {...stylex.props(styles.phone)}>
          <NoteBoard state={{ kind: "ready", data: BOARD_NOTES }} expiry="1d" {...board} />
        </div>
      </GalleryGroup>
      <GalleryGroup title={gallery.groups.noteSheet}>
        {DEMOS.map((demo) => (
          <Button key={demo.label} variant="secondary" onClick={() => setOpen(demo)}>
            {demo.label}
          </Button>
        ))}
        {open && (
          <NoteSheetDemo
            key={open.label}
            season={season}
            demo={open}
            onClose={() => setOpen(null)}
          />
        )}
      </GalleryGroup>
    </>
  );
}
