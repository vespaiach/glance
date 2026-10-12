import * as stylex from "@stylexjs/stylex";
import { ArrowRight, Plus, StickyNote as StickyNoteGlyph } from "lucide-react";
import { copy } from "@/copy";
import type { Note } from "@/domain/schemas";
import type { Clock } from "@/domain/time";
import type { ZoneState } from "@/domain/zoneState";
import { noteStampText } from "@/features/notes";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { Eyebrow } from "@/ui/Eyebrow";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";
import { StickyNote } from "@/ui/StickyNote";
import { Zone } from "@/ui/Zone";

type TodayNotesProps = {
  state: ZoneState<Note>;
  now: Date;
  clock: Clock;
  onOpenNote: (id: string) => void;
  onAddNote: () => void;
  onOpenNotes: () => void;
  xstyle?: stylex.StyleXStyles;
};

const SHOWN = 2;

const styles = stylex.create({
  root: {
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.lg,
    paddingTop: space.xs,
    paddingInline: space.xs,
    paddingBottom: space.md,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: space.sm,
    minWidth: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.xs,
    paddingInlineStart: space.xs,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 20,
    paddingBlock: space.xxs,
    paddingInline: space.sm,
  },
  empty: {
    marginInline: space.xs,
    minHeight: 160,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.lg,
    padding: space.lg,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 14,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 340,
    letterSpacing: "-0.3px",
    lineHeight: 1.2,
  },
});

function countFor(state: ZoneState<Note>): string {
  if (state.kind === "loading") return copy.today.notes.loadingCount;

  return copy.today.notes.count(state.kind === "ready" ? state.data.length : 0);
}

function NotesSkeleton() {
  return (
    <Skeleton label={copy.today.notes.loading} xstyle={styles.grid}>
      <SkeletonBlock height={150} radius={radii.sm} />
      <SkeletonBlock height={150} radius={radii.sm} />
    </Skeleton>
  );
}

export function TodayNotes({
  state,
  now,
  clock,
  onOpenNote,
  onAddNote,
  onOpenNotes,
  xstyle,
}: TodayNotesProps) {
  return (
    <section {...stylex.props(styles.root, xstyle)}>
      <div {...stylex.props(styles.header)}>
        <Eyebrow>{countFor(state)}</Eyebrow>
        <Button variant="ghost" iconRight={ArrowRight} onClick={onOpenNotes}>
          {copy.today.notes.allNotes}
        </Button>
      </div>
      <Zone
        state={state}
        loading={<NotesSkeleton />}
        empty={
          <div {...stylex.props(styles.empty)}>
            <span {...stylex.props(styles.emptyTitle)}>{copy.today.notes.emptyTitle}</span>
            <Button variant="secondary" icon={Plus} onClick={onAddNote}>
              {copy.today.notes.addNote}
            </Button>
          </div>
        }
        failed={<EmptyState icon={StickyNoteGlyph} title={copy.today.unavailable.notes} />}
      >
        {(notes) => (
          <div {...stylex.props(styles.grid)}>
            {notes.slice(0, SHOWN).map((note) => (
              <StickyNote
                key={note.id}
                tone={note.tone}
                rotate={note.rotation}
                author={note.author}
                time={noteStampText(note, now, clock)}
                width="100%"
                minHeight={150}
                onClick={() => onOpenNote(note.id)}
              >
                {note.text}
              </StickyNote>
            ))}
          </div>
        )}
      </Zone>
    </section>
  );
}
