import * as stylex from "@stylexjs/stylex";
import { SquarePen, StickyNote as StickyNoteGlyph } from "lucide-react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import { type BoardNote, boardText } from "@/domain/notes";
import type { AccountSettings } from "@/domain/schemas";
import { type Clock, clockAt } from "@/domain/time";
import type { ZoneState } from "@/domain/zoneState";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { NotePad } from "@/ui/NotePad";
import { press } from "@/ui/press";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";
import { SourceFailure } from "@/ui/SourceFailure";
import { StickyNote } from "@/ui/StickyNote";
import { Zone } from "@/ui/Zone";
import { noteStampText } from "../stamp";

type Expiry = AccountSettings["noteExpiry"];

type NoteBoardProps = {
  state: ZoneState<BoardNote>;
  retryIn: number;
  onRetry: () => void;
  expiry: Expiry;
  now: Date;
  clock: Clock;
  tz: string;
  breakpoint: Breakpoint;
  onOpenNote: (id: string) => void;
  onAddNote: () => void;
  xstyle?: stylex.StyleXStyles;
};

const SKELETON_NOTES = [0, 1, 2];

const styles = stylex.create({
  root: {
    minHeight: "100%",
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.lg,
    padding: "clamp(16px, 2vw, 32px)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: space.xl,
    minWidth: 0,
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: space.md,
  },
  heading: {
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
  },
  title: {
    margin: 0,
    fontSize: type.displayXlSize,
    fontWeight: 340,
    letterSpacing: "-1px",
    lineHeight: 1,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(clamp(220px, 17vw, 340px), 1fr))",
    gap: "clamp(36px, 2.5vw, 48px)",
    paddingTop: space.xs,
    paddingInline: 12,
    paddingBottom: space.lg,
  },
  note: {
    display: "block",
    width: "100%",
    margin: 0,
    padding: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    font: "inherit",
    color: "inherit",
    textAlign: "start",
    cursor: "pointer",
    borderRadius: radii.sm,
  },
  noteText: {
    fontSize: "clamp(24px, 1.6vw, 32px)",
    lineHeight: 1.3,
    overflowWrap: "anywhere",
  },
  emptyTile: {
    flexGrow: 1,
    minHeight: 340,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.borderHairline,
    borderRadius: radii.lg,
    padding: "clamp(28px, 3.2vw, 48px)",
    boxSizing: "border-box",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    alignContent: "center",
    justifyContent: "center",
    gap: "clamp(40px, 5vw, 72px)",
  },
  emptyText: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 600,
    minWidth: 260,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  emptyTitle: {
    fontSize: type.displayLgSize,
    fontWeight: 340,
    letterSpacing: "-0.8px",
    lineHeight: 1.1,
  },
  emptyBody: {
    fontSize: "clamp(18px, 1.25vw, 24px)",
    fontWeight: 330,
    lineHeight: 1.45,
    maxWidth: 560,
    textWrap: "pretty",
  },
});

export function NoteBoard({
  state,
  retryIn,
  onRetry,
  expiry,
  now,
  clock,
  tz,
  breakpoint,
  onOpenNote,
  onAddNote,
  xstyle,
}: NoteBoardProps) {
  const large = breakpoint === "large";

  return (
    <section {...stylex.props(styles.root, xstyle)}>
      <div {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.heading)}>
          <Eyebrow>{countFor(state, expiry, clock, tz)}</Eyebrow>
          <h2 {...stylex.props(styles.title)}>{copy.notes.board}</h2>
        </div>
        <Button icon={SquarePen} size={large ? "lg" : "md"} onClick={onAddNote}>
          {copy.notes.addNote}
        </Button>
      </div>
      <Zone
        state={state}
        loading={<BoardSkeleton />}
        empty={<EmptyBoard onAddNote={onAddNote} />}
        failed={
          <SourceFailure
            icon={StickyNoteGlyph}
            title={copy.notes.unavailable}
            body={copy.zone.failedBody(retryIn)}
            retryLabel={copy.zone.retry}
            onRetry={onRetry}
          />
        }
      >
        {(notes) => (
          <div {...stylex.props(styles.grid)}>
            {notes.map((note) => {
              const time = noteStampText(note, now, clock, tz);

              return (
                <button
                  key={note.id}
                  type="button"
                  aria-label={copy.notes.noteName(note.author, time, note.text)}
                  onClick={() => onOpenNote(note.id)}
                  {...stylex.props(styles.note, press.scale)}
                >
                  <StickyNote
                    rotate={note.rotation}
                    author={note.author}
                    time={time}
                    width="100%"
                    minHeight={large ? 280 : 200}
                  >
                    <span {...stylex.props(styles.noteText)}>{boardText(note.text)}</span>
                  </StickyNote>
                </button>
              );
            })}
          </div>
        )}
      </Zone>
    </section>
  );
}

function countFor(state: ZoneState<BoardNote>, expiry: Expiry, clock: Clock, tz: string): string {
  if (state.kind === "loading") return copy.notes.loadingCount;

  if (state.kind === "failed") return copy.notes.failedCount;

  if (state.kind === "empty") return copy.notes.count(0, expiry);

  const count = copy.notes.count(state.data.length, expiry);

  if (state.updatedAt === undefined) return count;

  return copy.zone.updated(count, clockAt(state.updatedAt, clock, tz));
}

function BoardSkeleton() {
  return (
    <Skeleton label={copy.notes.loading} xstyle={styles.grid}>
      {SKELETON_NOTES.map((note) => (
        <SkeletonBlock key={note} height={200} radius={radii.sm} />
      ))}
    </Skeleton>
  );
}

function EmptyBoard({ onAddNote }: { onAddNote: () => void }) {
  return (
    <div {...stylex.props(styles.emptyTile)}>
      <NotePad size="lg" label={copy.notes.addFirst} onClick={onAddNote} />
      <div {...stylex.props(styles.emptyText)}>
        <span {...stylex.props(styles.emptyTitle)}>{copy.notes.emptyTitle}</span>
        <span {...stylex.props(styles.emptyBody)}>{copy.notes.emptyBody}</span>
      </div>
    </div>
  );
}
