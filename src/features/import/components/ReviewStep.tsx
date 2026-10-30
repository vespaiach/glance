import * as stylex from "@stylexjs/stylex";
import { CopyCheck, FileText } from "lucide-react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import type { Tag } from "@/domain/schemas";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { press } from "@/ui/press";
import { tagFills } from "@/ui/tagFills";
import type { ImportPageAction, ImportReview, ImportRow, ImportWho } from "../importPage";
import { panel } from "./importStyles";

type ReviewStepProps = {
  breakpoint: Breakpoint;
  review: ImportReview;
  who: ImportWho;
  busy: boolean;
  tags: readonly Tag[];
  dispatch: (action: ImportPageAction) => void;
};

type ChipProps = {
  name: string;
  color?: Tag["color"];
  on: boolean;
  busy: boolean;
  onPick: () => void;
};

const words = copy.import;

const styles = stylex.create({
  left: {
    gap: 28,
  },
  titles: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  file: {
    flexWrap: "nowrap",
    gap: 16,
  },
  fileText: {
    flexGrow: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  fileName: {
    fontSize: 17,
    fontWeight: 540,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  who: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 48,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
    paddingBlock: 4,
    paddingLeft: 4,
    paddingRight: 16,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
    fontFamily: "inherit",
    fontSize: 17,
    fontWeight: 480,
    whiteSpace: "nowrap",
    cursor: { default: "pointer", ":disabled": "default" },
    opacity: { default: 1, ":disabled": 0.4 },
    transitionProperty: "transform, background-color",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  },
  chipOn: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
  },
  skip: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
  },
  skipText: {
    margin: 0,
    fontSize: 15,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  right: {
    gap: 12,
    paddingTop: "clamp(20px, 2.4vw, 32px)",
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
  },
  row: {
    minHeight: 56,
    boxSizing: "border-box",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "4px 16px",
    paddingBlock: 6,
    borderTopWidth: { default: 1, ":first-child": 0 },
    borderTopStyle: "solid",
    borderTopColor: colors.borderHairlineSoft,
  },
  date: {
    width: 120,
    flexShrink: 0,
  },
  title: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 160,
    minWidth: 0,
    fontSize: 17,
    fontWeight: 540,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  duplicate: {
    fontWeight: 330,
  },
  time: {
    fontSize: 15,
    fontWeight: 330,
    whiteSpace: "nowrap",
  },
});

const columns = stylex.create({
  large: { gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.15fr)" },
  normal: { gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.15fr)" },
  small: { gridTemplateColumns: "minmax(0, 1fr)" },
});

export function ReviewStep({ breakpoint, review, who, busy, tags, dispatch }: ReviewStepProps) {
  const pick = (next: ImportWho) => dispatch({ type: "who", who: next });

  return (
    <div {...stylex.props(panel.grid, columns[breakpoint])}>
      <section {...stylex.props(panel.card, styles.left)}>
        <div {...stylex.props(styles.titles)}>
          <Eyebrow>{words.review.eyebrow}</Eyebrow>
          <h2 {...stylex.props(panel.headline)}>{words.review.found(review.rows.length)}</h2>
        </div>
        <div {...stylex.props(panel.softTile, styles.file)}>
          <span {...stylex.props(panel.round("48px"), panel.onCanvas)}>
            <Icon icon={FileText} size={22} />
          </span>
          <span {...stylex.props(styles.fileText)}>
            <span {...stylex.props(styles.fileName)}>{review.fileName}</span>
            <span {...stylex.props(panel.mono)}>
              {words.review.file(words.range(review.range.from, review.range.to), review.size)}
            </span>
          </span>
          <Button variant="ghost" disabled={busy} onClick={() => dispatch({ type: "source" })}>
            {words.review.change}
          </Button>
        </div>
        <div {...stylex.props(styles.who)}>
          <Eyebrow>{words.review.who}</Eyebrow>
          <div role="radiogroup" aria-label={words.review.who} {...stylex.props(styles.chips)}>
            <Chip
              name={words.everyone}
              on={who === "everyone"}
              busy={busy}
              onPick={() => pick("everyone")}
            />
            {tags.map((tag) => (
              <Chip
                key={tag.id}
                name={tag.name}
                color={tag.color}
                on={who === tag.id}
                busy={busy}
                onPick={() => pick(tag.id)}
              />
            ))}
          </div>
          {review.matched > 0 && (
            <p {...stylex.props(styles.skipText)}>{words.review.matched(review.matched)}</p>
          )}
        </div>
        <span {...stylex.props(panel.spacer)} />
        <div {...stylex.props(styles.skip)}>
          <Icon icon={CopyCheck} size={20} />
          <p {...stylex.props(styles.skipText)}>{words.review.skipped(review.duplicates)}</p>
        </div>
      </section>
      <section {...stylex.props(panel.card, styles.right)}>
        <Eyebrow>{words.review.all(review.rows.length)}</Eyebrow>
        <ul {...stylex.props(styles.list)}>
          {review.rows.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function Chip({ name, color, on, busy, onPick }: ChipProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a styled pill keeps the 48 px chip, the color dot and the press scale, as the design's Who chips
    <button
      type="button"
      role="radio"
      aria-checked={on}
      disabled={busy}
      onClick={onPick}
      {...stylex.props(styles.chip, on && styles.chipOn, press.scale)}
    >
      <span
        aria-hidden="true"
        {...stylex.props(panel.round("40px"), color ? tagFills[color] : panel.onCanvas)}
      />
      {name}
    </button>
  );
}

function Row({ row }: { row: ImportRow }) {
  return (
    <li {...stylex.props(styles.row)}>
      <span {...stylex.props(panel.mono, styles.date)}>{row.date}</span>
      <span {...stylex.props(styles.title, row.duplicate && styles.duplicate)}>
        {row.duplicate ? words.review.duplicate(row.title) : row.title}
      </span>
      <span {...stylex.props(styles.time)}>{rowTime(row)}</span>
    </li>
  );
}

function rowTime({ time, weekly }: ImportRow): string {
  const shown = time ?? words.review.allDay;

  return weekly ? words.review.weekly(shown) : shown;
}
