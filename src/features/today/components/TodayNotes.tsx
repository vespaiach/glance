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
import { NotePad } from "@/ui/NotePad";
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
  columns: 1 | 2;
  limit: 1 | 2;
  xstyle?: stylex.StyleXStyles;
};

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
    gap: 24,
    paddingBlock: space.xxs,
    paddingInline: space.sm,
  },
  one: { gridTemplateColumns: "minmax(0, 1fr)" },
  two: { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
  empty: {
    marginInline: space.xs,
    minHeight: 160,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.borderHairline,
    borderRadius: radii.lg,
    paddingBlock: space.lg,
    paddingInline: 28,
    boxSizing: "border-box",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.xl,
  },
  emptyText: {
    flexGrow: 1,
    flexBasis: 180,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 14,
  },
  emptyCopy: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 340,
    letterSpacing: "-0.3px",
    lineHeight: 1.2,
  },
  emptyBody: {
    fontSize: 16,
    fontWeight: 330,
    lineHeight: 1.4,
    textWrap: "pretty",
  },
});

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
  columns,
  limit,
  xstyle,
}: TodayNotesProps) {
  const grid = [styles.grid, columns === 1 ? styles.one : styles.two];

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
            <NotePad label={copy.notes.addFirst} onClick={onAddNote} />
            <div {...stylex.props(styles.emptyText)}>
              <div {...stylex.props(styles.emptyCopy)}>
                <span {...stylex.props(styles.emptyTitle)}>{copy.today.notes.emptyTitle}</span>
                <span {...stylex.props(styles.emptyBody)}>{copy.today.notes.emptyBody}</span>
              </div>
              <Button variant="secondary" icon={Plus} onClick={onAddNote}>
                {copy.today.notes.addNote}
              </Button>
            </div>
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
          <div {...stylex.props(grid)}>
            {notes.slice(0, limit).map((note) => (
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

function countFor(state: ZoneState<BoardNote>, clock: Clock, tz: string): string {
  if (state.kind === "loading" || state.kind === "failed") return copy.today.notes.loadingCount;

  if (state.kind === "empty") return copy.today.notes.count(0);

  const count = copy.today.notes.count(state.data.length);

  if (state.updatedAt === undefined) return count;

  return copy.zone.updated(count, clockAt(state.updatedAt, clock, tz));
}

function NotesSkeleton() {
  return (
    <Skeleton label={copy.today.notes.loading} xstyle={[styles.grid, styles.two]}>
      <SkeletonBlock height={150} radius={radii.sm} />
      <SkeletonBlock height={150} radius={radii.sm} />
    </Skeleton>
  );
}
