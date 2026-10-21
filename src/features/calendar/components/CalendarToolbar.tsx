import * as stylex from "@stylexjs/stylex";
import { Clock, Plus } from "lucide-react";
import { copy } from "@/copy";
import type { Tag } from "@/domain/schemas";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { press } from "@/ui/press";

type CalendarToolbarProps = {
  tags: readonly Tag[];
  filter: ReadonlySet<string>;
  span24: boolean;
  outside: number;
  phone: boolean;
  onToggleTag: (id: string) => void;
  onToggleSpan: () => void;
  onAddEvent: () => void;
};

const styles = stylex.create({
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    rowGap: 12,
    columnGap: 16,
  },
  people: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 520,
  },
  pills: {
    margin: 0,
    padding: 0,
    borderWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    flexShrink: 1,
    overflowX: "auto",
    scrollbarWidth: "none",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    rowGap: 12,
    columnGap: 16,
    flexShrink: 0,
    minWidth: 0,
  },
  actionsPhone: {
    flexShrink: 1,
  },
  pill: (height: number) => ({
    flexShrink: 0,
    height,
    display: "flex",
    alignItems: "center",
    gap: 8,
    paddingBlock: 0,
    paddingInlineStart: 12,
    paddingInlineEnd: 16,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
    fontFamily: type.fontSans,
    fontSize: 16,
    fontWeight: 480,
    whiteSpace: "nowrap",
    cursor: "pointer",
    transitionProperty: "transform, background-color, color",
    transitionDuration: `${motion.durPress}, ${motion.durFast}, ${motion.durFast}`,
    transitionTimingFunction: motion.easeOut,
  }),
  tag: {
    paddingInlineStart: 18,
    paddingInlineEnd: 18,
    backgroundColor: colors.borderHairline,
  },
  span: {
    paddingInlineStart: 14,
    paddingInlineEnd: 18,
    fontSize: type.buttonSize,
  },
  on: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
  },
  badge: {
    minWidth: 24,
    height: 24,
    boxSizing: "border-box",
    paddingInline: 7,
    display: "grid",
    placeItems: "center",
    borderRadius: radii.full,
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
    fontFamily: type.fontMono,
    fontSize: 13,
    letterSpacing: "0.4px",
  },
  soft: (height: number) => ({
    flexShrink: 0,
    minHeight: height,
    backgroundColor: colors.surfaceSoft,
  }),
  add: {
    paddingInlineStart: 18,
    paddingInlineEnd: 22,
  },
});

const fills = stylex.create({
  lilac: { backgroundColor: colors.blockLilac },
  sky: { backgroundColor: colors.blockSky },
  coral: { backgroundColor: colors.blockCoral },
  mint: { backgroundColor: colors.blockMint },
  sun: { backgroundColor: colors.blockSun },
  pink: { backgroundColor: colors.blockPink },
  lime: { backgroundColor: colors.blockLime },
  rust: { backgroundColor: colors.blockRust },
  glacier: { backgroundColor: colors.blockGlacier },
  amber: { backgroundColor: colors.blockAmber },
  sage: { backgroundColor: colors.blockSage },
  ice: { backgroundColor: colors.blockIce },
});

const PILL_HEIGHT = { phone: 44, other: 48 } as const;

export function CalendarToolbar({
  tags,
  filter,
  span24,
  outside,
  phone,
  onToggleTag,
  onToggleSpan,
  onAddEvent,
}: CalendarToolbarProps) {
  const height = phone ? PILL_HEIGHT.phone : PILL_HEIGHT.other;

  const words = copy.calendar;

  return (
    <div {...stylex.props(styles.row)}>
      <div {...stylex.props(styles.people)}>
        <fieldset aria-label={words.showPlansFor} {...stylex.props(styles.pills)}>
          {tags.map((tag) => (
            <TagPill
              key={tag.id}
              tag={tag}
              selected={filter.has(tag.id)}
              height={height}
              onClick={() => onToggleTag(tag.id)}
            />
          ))}
        </fieldset>
      </div>
      <div {...stylex.props(styles.actions, phone && styles.actionsPhone)}>
        <button
          type="button"
          aria-pressed={span24}
          aria-label={words.span(span24 ? 0 : outside)}
          onClick={onToggleSpan}
          {...stylex.props(styles.pill(height), styles.span, span24 && styles.on, press.scale)}
        >
          <Icon icon={Clock} size={20} />
          {words.spanLabel}
          {!span24 && outside > 0 && <span {...stylex.props(styles.badge)}>{outside}</span>}
        </button>
        <Button
          variant="ghost"
          icon={Plus}
          onClick={onAddEvent}
          xstyle={[styles.soft(height), styles.add]}
        >
          {words.addEvent}
        </Button>
      </div>
    </div>
  );
}

type TagPillProps = {
  tag: Tag;
  selected: boolean;
  height: number;
  onClick: () => void;
};

function TagPill({ tag, selected, height, onClick }: TagPillProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      {...stylex.props(styles.pill(height), styles.tag, selected && fills[tag.color], press.scale)}
    >
      {tag.name}
    </button>
  );
}
