import * as stylex from "@stylexjs/stylex";
import { ArrowRight, Plus, StickyNote as StickyNoteGlyph } from "lucide-react";
import { copy } from "@/copy";
import type { BoardNote } from "@/domain/notes";
import { type Clock, clockAt } from "@/domain/time";
import type { ZoneState } from "@/domain/zoneState";
import { noteStampText } from "@/features/notes";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";
import { SourceFailure } from "@/ui/SourceFailure";
import { StickyNote } from "@/ui/StickyNote";
import { Zone } from "@/ui/Zone";

type TodayNotesProps = {
  state: ZoneState<BoardNote>;
  retryIn: number;
  onRetry: () => void;
  now: Date;
  clock: Clock;
  tz: string;
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
    gap: 24,
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
    gap: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 340,
    letterSpacing: "-0.3px",
    lineHeight: 1.2,
  },
});

function countFor(state: ZoneState<BoardNote>, clock: Clock, tz: string): string {
  if (state.kind === "loading" || state.kind === "failed") return copy.today.notes.loadingCount;

  if (state.kind === "empty") return copy.today.notes.count(0);

  const count = copy.today.notes.count(state.data.length);

  if (state.updatedAt === undefined) return count;

  return copy.zone.updated(count, clockAt(state.updatedAt, clock, tz));
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
  retryIn,
  onRetry,
  now,
  clock,
  tz,
  onOpenNote,
  onAddNote,
  onOpenNotes,
  xstyle,
}: TodayNotesProps) {
  return (
    <section {...stylex.props(styles.root, xstyle)}>
      <div {...stylex.props(styles.header)}>
        <Eyebrow>{countFor(state, clock, tz)}</Eyebrow>
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
        failed={
          <SourceFailure
            icon={StickyNoteGlyph}
            title={copy.today.unavailable.notes}
            body={copy.zone.failedBody(retryIn)}
            retryLabel={copy.zone.retry}
            onRetry={onRetry}
          />
        }
      >
        {(notes) => (
          <div {...stylex.props(styles.grid)}>
            {notes.slice(0, SHOWN).map((note) => (
              <StickyNote
                key={note.id}
                tone={note.tone}
                rotate={note.rotation}
                author={note.author}
                time={noteStampText(note, now, clock, tz)}
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
