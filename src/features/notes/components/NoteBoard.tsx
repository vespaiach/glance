import * as stylex from "@stylexjs/stylex";
import { Plus, StickyNote as StickyNoteGlyph } from "lucide-react";
import { copy } from "@/copy";
import type { BoardNote } from "@/domain/notes";
import type { AccountSettings } from "@/domain/schemas";
import { type Clock, clockAt } from "@/domain/time";
import type { ZoneState } from "@/domain/zoneState";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
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
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 32,
    paddingTop: space.xs,
    paddingInline: space.sm,
    paddingBottom: space.lg,
  },
  emptyTile: {
    minHeight: 340,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.lg,
    padding: "clamp(28px, 3.2vw, 48px)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: space.md,
  },
  emptyText: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  emptyTitle: {
    fontSize: type.displayLgSize,
    fontWeight: 340,
    letterSpacing: "-0.8px",
    lineHeight: 1.1,
  },
  emptyBody: {
    fontSize: 18,
    fontWeight: 330,
    lineHeight: 1.45,
    maxWidth: 520,
    textWrap: "pretty",
  },
  caption: {
    lineHeight: "normal",
  },
});

const keepKey = (expiry: Expiry) => expiry ?? "never";

export function NoteBoard({
  state,
  retryIn,
  onRetry,
  expiry,
  now,
  clock,
  tz,
  onOpenNote,
  onAddNote,
  xstyle,
}: NoteBoardProps) {
  return (
    <section {...stylex.props(styles.root, xstyle)}>
      <div {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.heading)}>
          <Eyebrow>{countFor(state, clock, tz)}</Eyebrow>
          <h2 {...stylex.props(styles.title)}>{copy.notes.board}</h2>
        </div>
        <Button icon={Plus} onClick={onAddNote}>
          {copy.notes.addNote}
        </Button>
      </div>
      <Zone
        state={state}
        loading={<BoardSkeleton />}
        empty={<EmptyBoard expiry={expiry} />}
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
          <>
            <div {...stylex.props(styles.grid)}>
              {notes.map((note) => (
                <StickyNote
                  key={note.id}
                  tone={note.tone}
                  rotate={note.rotation}
                  author={note.author}
                  time={noteStampText(note, now, clock, tz)}
                  width="100%"
                  minHeight={200}
                  onClick={() => onOpenNote(note.id)}
                >
                  {note.text}
                </StickyNote>
              ))}
            </div>
            <Eyebrow size="caption" xstyle={styles.caption}>
              {copy.notes.caption(copy.notes.keep[keepKey(expiry)])}
            </Eyebrow>
          </>
        )}
      </Zone>
    </section>
  );
}

function countFor(state: ZoneState<BoardNote>, clock: Clock, tz: string): string {
  if (state.kind === "loading") return copy.notes.loadingCount;

  if (state.kind === "failed") return copy.notes.failedCount;

  if (state.kind === "empty") return copy.notes.count(0);

  const count = copy.notes.count(state.data.length);

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

function EmptyBoard({ expiry }: { expiry: Expiry }) {
  return (
    <div {...stylex.props(styles.emptyTile)}>
      <Icon icon={StickyNoteGlyph} size={40} strokeWidth={1.5} />
      <div {...stylex.props(styles.emptyText)}>
        <span {...stylex.props(styles.emptyTitle)}>{copy.notes.emptyTitle}</span>
        <span {...stylex.props(styles.emptyBody)}>
          {copy.notes.emptyBody(copy.notes.emptyKeep[keepKey(expiry)])}
        </span>
      </div>
    </div>
  );
}
