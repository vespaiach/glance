import * as stylex from "@stylexjs/stylex";
import { Bell, BellOff, Lock, Plus } from "lucide-react";
import { Fragment, type KeyboardEvent } from "react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import {
  type DefaultWord,
  type EventWord,
  isPlaceholder,
  type SentenceWord,
  sentenceTokens,
  whoText,
} from "@/domain/eventSentence";
import type { Tag, TagColor } from "@/domain/schemas";
import { type Clock, formatClock, formatMonthDay, formatWeekday } from "@/domain/time";
import { parseDateKey } from "@/domain/zone";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { Icon } from "@/ui/Icon";
import { press } from "@/ui/press";
import { tagFills } from "@/ui/tagFills";
import type { PageDraft } from "../eventPage";

export type SameTime = {
  tagIds: readonly string[];
  title: string;
  start: number;
  end: number;
  more: number;
};

type EventSentenceProps = {
  breakpoint: Breakpoint;
  mode: "edit" | "view";
  draft: PageDraft;
  tags: readonly Tag[];
  touched: readonly DefaultWord[];
  word: EventWord | null;
  clock: Clock;
  locked?: boolean;
  sameTime?: SameTime;
  onSelect: (word: EventWord) => void;
  onAddEnd: () => void;
  onNotify: (on: boolean) => void;
};

type Piece = {
  text: string;
  placeholder: boolean;
  wrap: boolean;
  color?: TagColor;
};

type WordProps = {
  word: SentenceWord;
  piece: Piece;
  mode: "edit" | "view";
  locked: boolean;
  selected: boolean;
  thin: boolean;
  onSelect: (word: EventWord) => void;
};

const words = copy.events.page;

const VIEW_NAMED = 3;

const VIEW_SHOWN = 2;

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    borderRadius: radii.lg,
    backgroundColor: season.block1,
    transitionProperty: "background-color",
    transitionDuration: motion.durSeason,
    transitionTimingFunction: motion.easeInOut,
  },
  sentence: {
    margin: 0,
    fontWeight: 340,
    lineHeight: 1.42,
    textWrap: "pretty",
  },
  word: {
    display: "inline",
    marginInline: "-0.1em",
    paddingBlock: "0.04em",
    paddingInline: "0.1em",
    borderRadius: radii.sm,
    backgroundColor: "transparent",
    textUnderlineOffset: "0.16em",
    boxDecorationBreak: "clone",
    WebkitBoxDecorationBreak: "clone",
    cursor: "pointer",
    outline: { default: "none", ":focus-visible": `2px solid ${colors.focusRing}` },
    transitionProperty: "background-color",
    transitionDuration: motion.durFast,
  },
  set: {
    fontWeight: 540,
    color: colors.textPrimary,
    textDecorationLine: "underline",
    textDecorationStyle: "solid",
  },
  placeholder: {
    fontWeight: 400,
    color: colors.textPlaceholder,
    textDecorationLine: "underline",
    textDecorationStyle: "dashed",
  },
  viewed: {
    textDecorationLine: "none",
  },
  thick: { textDecorationThickness: 3 },
  thin: { textDecorationThickness: 2 },
  nowrap: { whiteSpace: "nowrap" },
  selected: { backgroundColor: colors.surfaceCanvas },
  locked: { cursor: "default" },
  dot: {
    display: "inline-block",
    width: "0.36em",
    height: "0.36em",
    marginRight: "0.22em",
    borderRadius: radii.full,
    boxShadow: `0 0 0 2px ${colors.surfaceCanvas}`,
    verticalAlign: "0.1em",
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px 28px",
    marginInline: -6,
  },
  link: {
    minHeight: 44,
    maxWidth: "100%",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    paddingBlock: 0,
    paddingInline: 6,
    borderWidth: 0,
    borderRadius: radii.sm,
    backgroundColor: "transparent",
    color: colors.textPrimary,
    fontFamily: "inherit",
    fontSize: 18,
    fontWeight: 480,
    textDecorationLine: "underline",
    textDecorationThickness: 2,
    textUnderlineOffset: 5,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    cursor: "pointer",
    transitionProperty: "transform, background-color",
    transitionDuration: `${motion.durPress}, ${motion.durFast}`,
  },
  clash: {
    minHeight: 44,
    minWidth: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    paddingInline: 6,
    fontSize: 18,
    fontWeight: 330,
    lineHeight: 1.35,
  },
  clashDot: {
    flexShrink: 0,
    width: 12,
    height: 12,
    borderRadius: radii.full,
    backgroundColor: season.accent,
  },
  strong: { fontWeight: 540 },
  notify: {
    marginLeft: "auto",
    minHeight: 44,
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    paddingBlock: 0,
    paddingInline: 6,
    borderWidth: 0,
    borderRadius: radii.md,
    backgroundColor: "transparent",
    color: colors.textPrimary,
    fontFamily: "inherit",
    fontSize: 18,
    fontWeight: 480,
    whiteSpace: "nowrap",
    cursor: "pointer",
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
  },
  track: {
    position: "relative",
    flexShrink: 0,
    width: 40,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceCanvas,
    boxShadow: `inset 0 0 0 1px ${colors.black}`,
    transitionProperty: "background-color",
    transitionDuration: motion.durFast,
  },
  trackOn: { backgroundColor: colors.black },
  knob: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 16,
    height: 16,
    borderRadius: radii.full,
    backgroundColor: colors.black,
    transform: "none",
    transitionProperty: "transform, background-color",
    transitionDuration: motion.durFast,
    transitionTimingFunction: motion.easeOut,
  },
  knobOn: { backgroundColor: colors.white, transform: "translateX(16px)" },
  bell: {
    marginLeft: "auto",
    flexShrink: 0,
    width: 44,
    height: 44,
    display: "grid",
    placeItems: "center",
    padding: 0,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: "transparent",
    color: colors.textPrimary,
    cursor: "pointer",
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
  },
  notes: {
    marginTop: 4,
    marginBottom: 0,
    marginInline: 0,
    maxWidth: "56ch",
    fontWeight: 330,
    lineHeight: 1.4,
    letterSpacing: "-0.2px",
    whiteSpace: "pre-line",
    textWrap: "pretty",
  },
  line: {
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 18,
    fontWeight: 480,
  },
});

const sizes = stylex.create({
  large: { gap: 16, paddingTop: 32, paddingInline: 48, paddingBottom: 24 },
  normal: { gap: 12, paddingTop: 24, paddingInline: 32, paddingBottom: 16 },
  small: { gap: 12, paddingTop: 16, paddingInline: 20, paddingBottom: 12 },
});

const sentenceSizes = stylex.create({
  large: { fontSize: 52, letterSpacing: "-1.1px" },
  normal: { fontSize: 40, letterSpacing: "-0.8px" },
  small: { fontSize: 28, letterSpacing: "-0.4px" },
});

const notesSizes = stylex.create({
  large: { fontSize: 26 },
  normal: { fontSize: 22 },
  small: { fontSize: 18 },
});

export function EventSentence(props: EventSentenceProps) {
  const { breakpoint, mode, draft, word, locked = false, onSelect } = props;

  const view = mode === "view";

  const tokens = sentenceTokens({
    allDay: draft.allDay,
    hasEnd: draft.end !== undefined,
    hasPlace: draft.location.trim() !== "",
    view,
  });

  return (
    <section aria-label={words.summary} {...stylex.props(styles.card, sizes[breakpoint])}>
      <p {...stylex.props(styles.sentence, sentenceSizes[breakpoint])}>
        {tokens.map((token) => (
          <Fragment key={token.word}>
            {token.join && words.joins[token.join]}
            {wordPieces(token.word, props).map((piece, index) =>
              typeof piece === "string" ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: joins are fixed text in a fixed order
                <Fragment key={index}>{piece}</Fragment>
              ) : (
                <Word
                  // biome-ignore lint/suspicious/noArrayIndexKey: the pieces of one word keep their order
                  key={index}
                  word={token.word}
                  piece={piece}
                  mode={mode}
                  locked={locked}
                  selected={word === token.word}
                  thin={breakpoint === "small"}
                  onSelect={onSelect}
                />
              ),
            )}
          </Fragment>
        ))}
        {words.period}
      </p>
      {view ? <ViewLines {...props} /> : <LinkRows {...props} />}
    </section>
  );
}

function Word({ word, piece, mode, locked, selected, thin, onSelect }: WordProps) {
  const field = words.fields[word];

  const look = stylex.props(
    styles.word,
    piece.placeholder ? styles.placeholder : styles.set,
    mode === "view" && styles.viewed,
    thin ? styles.thin : styles.thick,
    !piece.wrap && styles.nowrap,
    selected && styles.selected,
    locked && styles.locked,
  );

  const content = (
    <>
      {piece.color && <span aria-hidden {...stylex.props(styles.dot, tagFills[piece.color])} />}
      {piece.text}
    </>
  );

  if (locked) return <span {...look}>{content}</span>;

  const select = () => onSelect(word);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();

    select();
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: words stay inline text so they wrap inside the sentence (EVT-02)
    <span
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={wordName(field, piece, mode)}
      onClick={select}
      onKeyDown={onKeyDown}
      {...look}
    >
      {content}
    </span>
  );
}

function LinkRows({
  breakpoint,
  draft,
  tags,
  word,
  clock,
  sameTime,
  onSelect,
  onAddEnd,
  onNotify,
}: EventSentenceProps) {
  const notes = draft.notes.trim();

  const on = draft.notify;

  return (
    <>
      <div {...stylex.props(styles.row)}>
        <button
          type="button"
          aria-pressed={word === "notes"}
          onClick={() => onSelect("notes")}
          {...stylex.props(styles.link, press.scale, word === "notes" && styles.selected)}
        >
          {notes === "" && <Icon icon={Plus} size={18} />}
          {notes === "" ? words.addNotes : words.notesPreview(notes)}
        </button>
        {draft.end === undefined && !draft.allDay && (
          <button type="button" onClick={onAddEnd} {...stylex.props(styles.link, press.scale)}>
            <Icon icon={Plus} size={18} />
            {words.addEnd}
          </button>
        )}
      </div>
      <div {...stylex.props(styles.row)}>
        {breakpoint === "normal" && sameTime && (
          <span role="status" {...stylex.props(styles.clash)}>
            <span aria-hidden {...stylex.props(styles.clashDot)} />
            <span>
              <span {...stylex.props(styles.strong)}>{words.sameTime}</span>{" "}
              {sameTimeText(sameTime, tags, clock)}
            </span>
          </span>
        )}
        {breakpoint === "small" ? (
          <button
            type="button"
            aria-label={words.notificationName(on)}
            onClick={() => onNotify(!on)}
            {...stylex.props(styles.bell, press.scale)}
          >
            <Icon icon={on ? Bell : BellOff} size={24} />
          </button>
        ) : (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={words.notificationName(on)}
            onClick={() => onNotify(!on)}
            {...stylex.props(styles.notify, press.scale)}
          >
            <span aria-hidden {...stylex.props(styles.track, on && styles.trackOn)}>
              <span {...stylex.props(styles.knob, on && styles.knobOn)} />
            </span>
            {words.notification}
          </button>
        )}
      </div>
    </>
  );
}

function ViewLines({ breakpoint, draft, locked }: EventSentenceProps) {
  const notes = draft.notes.trim();

  return (
    <>
      {notes !== "" && <p {...stylex.props(styles.notes, notesSizes[breakpoint])}>{notes}</p>}
      {!draft.notify && (
        <div {...stylex.props(styles.line)}>
          <Icon icon={BellOff} size={18} />
          {words.notificationOff}
        </div>
      )}
      {locked && (
        <div {...stylex.props(styles.line)}>
          <Icon icon={Lock} size={18} />
          {words.ended}
        </div>
      )}
    </>
  );
}

function wordPieces(word: SentenceWord, props: EventSentenceProps): (Piece | string)[] {
  const { mode, draft, touched, clock } = props;

  const placeholder = mode === "edit" && isPlaceholder(word, draft, touched);

  const fixed = (text: string): Piece => ({ text, placeholder, wrap: false });

  const free = (text: string): Piece => ({ text, placeholder, wrap: !placeholder });

  switch (word) {
    case "title":
      return [free(draft.title.trim() || words.titlePlaceholder)];
    case "day":
      return [fixed(dayText(draft.day))];
    case "start":
      return [fixed(draft.allDay ? words.allDay : formatClock(draft.start, clock))];
    case "end":
      return [fixed(formatClock(draft.end ?? draft.start, clock))];
    case "who":
      return mode === "view" ? viewWho(props) : [free(whoWords(draft.tagIds, props.tags))];
    case "where":
      return [free(draft.location.trim() || words.wherePlaceholder)];
  }
}

function viewWho({ draft, tags }: EventSentenceProps): (Piece | string)[] {
  const people = tags.filter((tag) => draft.tagIds.includes(tag.id));

  if (people.length === 0 || people.length === tags.length) {
    return [{ text: whoWords(draft.tagIds, tags), placeholder: false, wrap: true }];
  }

  const many = people.length > VIEW_NAMED;

  const shown = many ? people.slice(0, VIEW_SHOWN) : people;

  const names = shown.flatMap((tag, index) => [
    ...(index === 0 ? [] : [index === shown.length - 1 && !many ? words.and : words.comma]),
    { text: tag.name, placeholder: false, wrap: false, color: tag.color },
  ]);

  if (!many) return names;

  return [
    ...names,
    words.and,
    { text: words.others(people.length - VIEW_SHOWN), placeholder: false, wrap: false },
  ];
}

function whoWords(tagIds: readonly string[], tags: readonly Tag[]): string {
  const who = whoText(tagIds, tags);

  if (who.kind === "everyone") return words.everyone;

  if (who.kind === "nobody") return words.nobody;

  return words.people(who.names, who.others);
}

function sameTimeText(
  { tagIds, title, start, end, more }: SameTime,
  tags: readonly Tag[],
  clock: Clock,
) {
  const who = whoText(tagIds, tags, 2);

  const names =
    who.kind === "people" ? words.people(who.names, who.others) : words.sameTimeEveryone;

  const one = who.kind !== "people" || (who.names.length === 1 && who.others === 0);

  const range = `${formatClock(start, clock)} – ${formatClock(end, clock)}`;

  return words.sameTimeText(names, one, title, range, more);
}

function wordName(field: string, piece: Piece, mode: "edit" | "view"): string {
  if (mode === "view") return words.edit(field, piece.text);

  return words.change(field, piece.placeholder ? words.notSet : piece.text);
}

function dayText(day: string): string {
  const date = parseDateKey(day);

  return `${formatWeekday(date, "UTC")}, ${formatMonthDay(date, "UTC")}`;
}
