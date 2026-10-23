"use client";

import * as stylex from "@stylexjs/stylex";
import { ArrowRight, SquarePen, StickyNote as StickyNoteGlyph } from "lucide-react";
import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import type { BoardNote } from "@/domain/notes";
import type { NoteTone } from "@/domain/schemas";
import { type Clock, clockAt } from "@/domain/time";
import type { ZoneState } from "@/domain/zoneState";
import { noteStampText } from "@/features/notes";
import { season } from "@/theme/seasons.stylex";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { IconButton } from "@/ui/IconButton";
import { NotePad } from "@/ui/NotePad";
import { press } from "@/ui/press";
import { Skeleton } from "@/ui/Skeleton";
import { SourceFailure } from "@/ui/SourceFailure";
import { StickyNote } from "@/ui/StickyNote";
import { useBoxSize } from "@/ui/useBoxSize";
import { Zone } from "@/ui/Zone";
import { fitNotes, type NotesRoom } from "../layout";

type TodayNotesProps = {
  state: ZoneState<BoardNote>;
  retryIn: number;
  onRetry: () => void;
  now: Date;
  clock: Clock;
  tz: string;
  breakpoint: Breakpoint;
  onOpenNote: (id: string) => void;
  onAddNote: () => void;
  onOpenNotes: () => void;
  xstyle?: stylex.StyleXStyles;
};

type HeaderActions = { add: boolean; all: boolean };

type ActionsProps = {
  actions: HeaderActions;
  narrow: boolean;
  onAddNote: () => void;
  onOpenNotes: () => void;
};

type NoteButtonProps = {
  note: BoardNote;
  hidden: boolean;
  time: string;
  onOpen: () => void;
};

type MoreRowProps = {
  notes: readonly BoardNote[];
  count: number;
  onOpenNotes: () => void;
};

type EmptyCardProps = { narrow: boolean; onAddNote: () => void };

type NoteTilesProps = { listRef: RefObject<HTMLDivElement | null>; fit: 1 | 2 };

const NARROW_BOX = 440;

const MAX_SHOWN = 2;

const MAX_DOTS = 3;

const TILE_TILTS = [-2, 1.5] as const;

const FIT_ITEM = "[data-fit]";

const styles = stylex.create({
  root: {
    position: "relative",
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.lg,
    padding: space.md,
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
    minHeight: 44,
    paddingInlineStart: space.xs,
  },
  actions: {
    display: "flex",
    gap: space.xxs,
  },
  iconButton: {
    width: 44,
    height: 44,
  },
  list: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    gap: 20,
    paddingTop: space.xxs,
    paddingInline: space.xs,
  },
  note: {
    display: "block",
    width: "100%",
    minWidth: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    padding: 0,
    font: "inherit",
    color: "inherit",
    textAlign: "start",
    cursor: "pointer",
  },
  hidden: { visibility: "hidden" },
  clamp: {
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  tiles: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  tile: {
    minHeight: 150,
    borderRadius: radii.sm,
    backgroundColor: season.soft,
  },
  tilt: (degrees: number) => ({ transform: `rotate(${degrees}deg)` }),
  moreWrap: {
    marginTop: "auto",
    paddingTop: space.xxs,
    paddingInline: space.xs,
  },
  more: {
    width: "100%",
    minHeight: 52,
    borderWidth: 0,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderHairline,
    borderRadius: 0,
    backgroundColor: "transparent",
    paddingTop: space.xxs,
    paddingBottom: 0,
    paddingInline: 0,
    display: "flex",
    alignItems: "center",
    gap: space.sm,
    font: "inherit",
    color: "inherit",
    textAlign: "start",
    cursor: "pointer",
  },
  dots: {
    display: "flex",
    flexShrink: 0,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    boxShadow: `0 0 0 2px ${colors.surfaceCanvas}`,
    marginInlineStart: { default: -8, ":first-child": 0 },
  },
  tone1: { backgroundColor: season.block1 },
  tone2: { backgroundColor: season.block2 },
  tone3: { backgroundColor: season.block3 },
  tone4: { backgroundColor: season.block4 },
  soft: { backgroundColor: season.soft },
  moreLabel: {
    flexGrow: 1,
    minWidth: 0,
    fontSize: 17,
    fontWeight: 480,
  },
  empty: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "auto",
    minHeight: 120,
    width: "100%",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.borderHairline,
    borderRadius: radii.lg,
    backgroundColor: "transparent",
    padding: space.lg,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: space.xl,
    font: "inherit",
    color: "inherit",
    textAlign: "start",
    cursor: "pointer",
  },
  emptyText: {
    flexGrow: 1,
    minWidth: 0,
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
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: space.xs,
    height: 44,
    paddingInlineStart: space.md,
    paddingInlineEnd: 20,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceCanvas,
    boxShadow: `inset 0 0 0 1px ${colors.borderHairline}`,
    fontSize: 17,
    fontWeight: 480,
  },
});

export function TodayNotes({
  state,
  retryIn,
  onRetry,
  now,
  clock,
  tz,
  breakpoint,
  onOpenNote,
  onAddNote,
  onOpenNotes,
  xstyle,
}: TodayNotesProps) {
  const ref = useRef<HTMLElement>(null);

  const listRef = useRef<HTMLDivElement>(null);

  const narrow = (useBoxSize(ref)?.width ?? Number.POSITIVE_INFINITY) < NARROW_BOX;

  const total = state.kind === "ready" ? state.data.length : MAX_SHOWN;

  const room = useNotesRoom(listRef, total, fitKey(state));

  const fit = fitNotes(breakpoint, room);

  const actions = headerActions(state, fit);

  return (
    <section ref={ref} {...stylex.props(styles.root, xstyle)}>
      <div {...stylex.props(styles.header)}>
        <Eyebrow>{eyebrowFor(state, clock, tz)}</Eyebrow>
        <Actions
          actions={actions}
          narrow={narrow}
          onAddNote={onAddNote}
          onOpenNotes={onOpenNotes}
        />
      </div>
      <Zone
        state={state}
        loading={<NoteTiles listRef={listRef} fit={fit} />}
        empty={<EmptyCard narrow={narrow} onAddNote={onAddNote} />}
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
          <>
            <div ref={listRef} {...stylex.props(styles.list)}>
              {notes.slice(0, MAX_SHOWN).map((note, index) => (
                <NoteButton
                  key={note.id}
                  note={note}
                  hidden={index >= fit}
                  time={noteStampText(note, now, clock, tz)}
                  onOpen={() => onOpenNote(note.id)}
                />
              ))}
            </div>
            {notes.length > fit && (
              <MoreRow
                notes={notes.slice(fit, fit + MAX_DOTS)}
                count={notes.length - fit}
                onOpenNotes={onOpenNotes}
              />
            )}
          </>
        )}
      </Zone>
    </section>
  );
}

function Actions({ actions, narrow, onAddNote, onOpenNotes }: ActionsProps) {
  if (narrow) {
    return (
      <div {...stylex.props(styles.actions)}>
        {actions.add && (
          <IconButton
            icon={SquarePen}
            label={copy.today.notes.addNote}
            variant="canvas"
            onClick={onAddNote}
            xstyle={styles.iconButton}
          />
        )}
        {actions.all && (
          <IconButton
            icon={ArrowRight}
            label={copy.today.notes.allNotes}
            variant="canvas"
            onClick={onOpenNotes}
            xstyle={styles.iconButton}
          />
        )}
      </div>
    );
  }

  return (
    <div {...stylex.props(styles.actions)}>
      {actions.add && (
        <Button variant="ghost" icon={SquarePen} onClick={onAddNote}>
          {copy.today.notes.addNote}
        </Button>
      )}
      {actions.all && (
        <Button variant="ghost" iconRight={ArrowRight} onClick={onOpenNotes}>
          {copy.today.notes.allNotes}
        </Button>
      )}
    </div>
  );
}

function NoteButton({ note, hidden, time, onOpen }: NoteButtonProps) {
  return (
    <button
      type="button"
      data-fit=""
      aria-label={copy.today.notes.noteName(note.author, note.text)}
      aria-hidden={hidden || undefined}
      inert={hidden}
      onClick={onOpen}
      {...stylex.props(styles.note, press.scale, hidden && styles.hidden)}
    >
      <StickyNote
        tone={note.tone}
        rotate={note.rotation}
        author={note.author}
        time={time}
        width="100%"
        minHeight={150}
      >
        <span {...stylex.props(styles.clamp)}>{note.text}</span>
      </StickyNote>
    </button>
  );
}

function MoreRow({ notes, count, onOpenNotes }: MoreRowProps) {
  const label = copy.today.notes.more(count);

  return (
    <div {...stylex.props(styles.moreWrap)}>
      <button
        type="button"
        aria-label={copy.today.notes.moreName(label)}
        onClick={onOpenNotes}
        {...stylex.props(styles.more, press.scale)}
      >
        <span aria-hidden="true" {...stylex.props(styles.dots)}>
          {notes.map((note) => (
            <span key={note.id} {...stylex.props(styles.dot, toneStyle(note.tone))} />
          ))}
        </span>
        <span {...stylex.props(styles.moreLabel)}>{label}</span>
        <Icon icon={ArrowRight} size={20} />
      </button>
    </div>
  );
}

function EmptyCard({ narrow, onAddNote }: EmptyCardProps) {
  return (
    <button
      type="button"
      aria-label={copy.notes.addFirst}
      onClick={onAddNote}
      {...stylex.props(styles.empty, press.scale)}
    >
      {!narrow && <NotePad />}
      <span {...stylex.props(styles.emptyText)}>
        <span {...stylex.props(styles.emptyCopy)}>
          <span {...stylex.props(styles.emptyTitle)}>{copy.today.notes.emptyTitle}</span>
          <span {...stylex.props(styles.emptyBody)}>{copy.today.notes.emptyBody}</span>
        </span>
        <span {...stylex.props(styles.pill)}>
          <Icon icon={SquarePen} size={18} />
          {copy.today.notes.addNote}
        </span>
      </span>
    </button>
  );
}

function NoteTiles({ listRef, fit }: NoteTilesProps) {
  return (
    <div ref={listRef} {...stylex.props(styles.list)}>
      <Skeleton label={copy.today.notes.loading} xstyle={styles.tiles}>
        {TILE_TILTS.map((tilt, index) => (
          <div
            key={tilt}
            data-fit=""
            aria-hidden="true"
            {...stylex.props(styles.tile, styles.tilt(tilt), index >= fit && styles.hidden)}
          />
        ))}
      </Skeleton>
    </div>
  );
}

function headerActions(state: ZoneState<BoardNote>, fit: 1 | 2): HeaderActions {
  if (state.kind === "loading") return { add: true, all: false };

  if (state.kind === "empty") return { add: false, all: false };

  if (state.kind === "failed") return { add: true, all: true };

  return { add: true, all: state.data.length <= fit };
}

function eyebrowFor(state: ZoneState<BoardNote>, clock: Clock, tz: string): string {
  if (state.kind !== "ready") return copy.today.notes.eyebrow;

  const count = copy.today.notes.count(state.data.length);

  if (state.updatedAt === undefined) return count;

  return copy.zone.updated(count, clockAt(state.updatedAt, clock, tz));
}

function fitKey(state: ZoneState<BoardNote>): string {
  if (state.kind !== "ready") return state.kind;

  return state.data
    .slice(0, MAX_SHOWN)
    .map((note) => `${note.id}:${note.text}`)
    .join("|");
}

function useNotesRoom(
  listRef: RefObject<HTMLDivElement | null>,
  total: number,
  key: string,
): NotesRoom | null {
  const [room, setRoom] = useState<NotesRoom | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: key re-measures when the shown notes change
  useLayoutEffect(() => {
    const list = listRef.current;

    if (list === null) return;

    const measure = () => setRoom((previous) => sameRoom(previous, measuredRoom(list, total)));

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(list);

    for (const item of list.querySelectorAll(FIT_ITEM)) observer.observe(item);

    return () => observer.disconnect();
  }, [listRef, total, key]);

  return room;
}

function measuredRoom(list: HTMLElement, total: number): NotesRoom | null {
  const items = list.querySelectorAll<HTMLElement>(FIT_ITEM);

  const last = items[MAX_SHOWN - 1];

  if (last === undefined) return null;

  const need = last.offsetTop + last.offsetHeight - list.offsetTop;

  return { room: list.clientHeight + moreRowRoom(list, total), need };
}

function moreRowRoom(list: HTMLElement, total: number): number {
  const more = list.nextElementSibling;

  if (total !== MAX_SHOWN || !(more instanceof HTMLElement)) return 0;

  return more.offsetTop + more.offsetHeight - (list.offsetTop + list.offsetHeight);
}

function sameRoom(previous: NotesRoom | null, next: NotesRoom | null): NotesRoom | null {
  if (previous === null || next === null) return next;

  return previous.room === next.room && previous.need === next.need ? previous : next;
}

function toneStyle(tone: NoteTone) {
  return typeof tone === "number" ? styles[`tone${tone}`] : styles[tone];
}
