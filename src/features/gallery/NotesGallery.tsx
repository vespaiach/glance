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
import { BOARD_NOTES, GALLERY_TZ, gallery, NOW } from "./samples";

type Demo = {
  label: string;
  mode: "new" | "edit";
  draft?: boolean;
  offline?: boolean;
  discard?: boolean;
};

const words = gallery.noteSheet;

const DEMOS: readonly Demo[] = [
  { label: words.edit, mode: "edit" },
  { label: words.new, mode: "new" },
  { label: words.draft, mode: "new", draft: true },
  { label: words.offline, mode: "new", offline: true },
  { label: words.discard, mode: "new", draft: true, discard: true },
];

const WIFI = BOARD_NOTES[1];

const WAITING_NOTES = BOARD_NOTES.map((note, index) =>
  index === 0 ? { ...note, waiting: true } : note,
);

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

export function NotesGallery({ season }: { season: Season }) {
  const [open, setOpen] = useState<Demo | null>(null);

  return (
    <>
      <GalleryGroup title={gallery.groups.notesView}>
        <div {...stylex.props(styles.view)}>
          <NoteBoard
            tz={GALLERY_TZ}
            state={{ kind: "ready", data: BOARD_NOTES }}
            expiry="1w"
            {...board}
          />
        </div>
        <div {...stylex.props(styles.view)}>
          <NoteBoard
            tz={GALLERY_TZ}
            state={{ kind: "ready", data: WAITING_NOTES }}
            expiry="1w"
            {...board}
          />
        </div>
        <div {...stylex.props(styles.view)}>
          <NoteBoard tz={GALLERY_TZ} state={{ kind: "empty" }} expiry="1w" {...board} />
        </div>
        <div {...stylex.props(styles.view)}>
          <NoteBoard tz={GALLERY_TZ} state={{ kind: "empty" }} expiry={null} {...board} />
        </div>
        <div {...stylex.props(styles.view)}>
          <NoteBoard tz={GALLERY_TZ} state={{ kind: "loading" }} expiry="1w" {...board} />
        </div>
        <div {...stylex.props(styles.view)}>
          <NoteBoard tz={GALLERY_TZ} state={{ kind: "failed" }} expiry="1w" {...board} />
        </div>
        <div {...stylex.props(styles.phone)}>
          <NoteBoard
            tz={GALLERY_TZ}
            state={{ kind: "ready", data: BOARD_NOTES }}
            expiry="1d"
            {...board}
          />
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
          ? copy.notes.sheet.eyebrow(edit.author, noteStampText(edit, NOW, "12h", GALLERY_TZ))
          : copy.notes.board
      }
      initial={initialNoteSheet(edit ? draftFromNote(edit) : draft, {
        opened: edit ? draftFromNote(edit) : newNoteDraft(),
        discard: demo.discard,
      })}
      swatches={noteSwatches(season)}
      offline={demo.offline ?? false}
      onClose={onClose}
      onDelete={onClose}
      onSave={onClose}
    />
  );
}
