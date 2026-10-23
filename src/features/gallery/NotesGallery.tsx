import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import type { Breakpoint } from "@/domain/breakpoint";
import {
  draftFromNote,
  initialNoteSheet,
  NoteBoard,
  NoteSheet,
  type NoteSheetState,
  newNoteDraft,
  noteStampText,
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
  details?: "posted" | "waiting";
  deleting?: boolean;
  long?: boolean;
  breakpoint?: Breakpoint;
};

const words = gallery.noteSheet;

const DEMOS: readonly Demo[] = [
  { label: words.details, mode: "edit", details: "posted" },
  { label: words.deleting, mode: "edit", details: "posted", deleting: true },
  { label: words.detailsWaiting, mode: "edit", details: "waiting" },
  { label: words.edit, mode: "edit" },
  { label: words.new, mode: "new" },
  { label: words.draft, mode: "new", draft: true },
  { label: words.offline, mode: "new", offline: true },
  { label: words.discard, mode: "new", draft: true, discard: true },
  { label: words.long, mode: "new", long: true },
  { label: words.small, mode: "new", draft: true, breakpoint: "small" },
];

const WIFI = BOARD_NOTES[1];

const LONG_NOTES = BOARD_NOTES.map((note, index) =>
  index === 2 ? { ...note, text: words.longText, author: "" } : note,
);

const WAITING_NOTES = BOARD_NOTES.map((note, index) =>
  index === 0 ? { ...note, waiting: true } : note,
);

const WEEK = { on: true, days: 7 };

const DAY = { on: true, days: 1 };

const OFF = { on: false, days: 7 };

const ignore = () => {};

const styles = stylex.create({
  view: {
    width: 1200,
  },
  small: {
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
  breakpoint: "large",
} as const;

export function NotesGallery() {
  const [open, setOpen] = useState<Demo | null>(null);

  return (
    <>
      <GalleryGroup title={gallery.groups.notesView}>
        <div {...stylex.props(styles.view)}>
          <NoteBoard
            tz={GALLERY_TZ}
            state={{ kind: "ready", data: LONG_NOTES }}
            expiry={WEEK}
            {...board}
          />
        </div>
        <div {...stylex.props(styles.view)}>
          <NoteBoard
            tz={GALLERY_TZ}
            state={{ kind: "ready", data: WAITING_NOTES }}
            expiry={WEEK}
            {...board}
          />
        </div>
        <div {...stylex.props(styles.view)}>
          <NoteBoard tz={GALLERY_TZ} state={{ kind: "empty" }} expiry={WEEK} {...board} />
        </div>
        <div {...stylex.props(styles.view)}>
          <NoteBoard tz={GALLERY_TZ} state={{ kind: "empty" }} expiry={OFF} {...board} />
        </div>
        <div {...stylex.props(styles.view)}>
          <NoteBoard tz={GALLERY_TZ} state={{ kind: "loading" }} expiry={WEEK} {...board} />
        </div>
        <div {...stylex.props(styles.view)}>
          <NoteBoard tz={GALLERY_TZ} state={{ kind: "failed" }} expiry={WEEK} {...board} />
        </div>
        <div {...stylex.props(styles.small)}>
          <NoteBoard
            tz={GALLERY_TZ}
            state={{ kind: "ready", data: BOARD_NOTES }}
            expiry={DAY}
            {...board}
            breakpoint="small"
          />
        </div>
      </GalleryGroup>
      <GalleryGroup title={gallery.groups.noteSheet}>
        {DEMOS.map((demo) => (
          <Button key={demo.label} variant="secondary" onClick={() => setOpen(demo)}>
            {demo.label}
          </Button>
        ))}
        {open && <NoteSheetDemo key={open.label} demo={open} onClose={() => setOpen(null)} />}
      </GalleryGroup>
    </>
  );
}

function NoteSheetDemo({ demo, onClose }: { demo: Demo; onClose: () => void }) {
  const edit = demo.mode === "edit" && (demo.details === "waiting" ? WAITING_NOTES[0] : WIFI);

  const time = edit ? noteStampText(edit, NOW, "12h", GALLERY_TZ) : "";

  return (
    <NoteSheet
      mode={demo.mode}
      initial={demoState(demo)}
      time={time}
      offline={demo.offline ?? false}
      breakpoint={demo.breakpoint ?? "large"}
      onClose={onClose}
      onDelete={onClose}
      onSave={onClose}
    />
  );
}

function demoState(demo: Demo): NoteSheetState {
  const edit = demo.mode === "edit" && (demo.details === "waiting" ? WAITING_NOTES[0] : WIFI);

  if (edit && demo.deleting) return { step: "deleting", opened: draftFromNote(edit) };

  return initialNoteSheet(edit ? draftFromNote(edit) : demoDraft(demo), {
    opened: edit ? draftFromNote(edit) : newNoteDraft(),
    discard: demo.discard,
    details: demo.details !== undefined,
  });
}

function demoDraft(demo: Demo) {
  if (demo.long) return newNoteDraft({ text: words.longText });

  return demo.draft ? newNoteDraft({ text: gallery.input.notesValue }) : newNoteDraft();
}
