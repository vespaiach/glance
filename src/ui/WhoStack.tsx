import * as stylex from "@stylexjs/stylex";
import { ChevronDown } from "lucide-react";
import type { Ref } from "react";
import type { Tag } from "@/domain/schemas";
import { initials, stackCircles } from "@/domain/tags";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { Icon } from "./Icon";
import { press } from "./press";
import { tagFills } from "./tagFills";

export type WhoStackSize = "large" | "small" | "today";

type WhoStackProps = {
  shown: readonly Tag[];
  max: number;
  size: WhoStackSize;
  label: string;
  name: string;
  more: (count: number) => string;
  onOpen: () => void;
  ref?: Ref<HTMLButtonElement>;
};

const HEIGHT: Record<WhoStackSize, number> = { large: 48, small: 44, today: 48 };

const styles = stylex.create({
  button: (minHeight: number) => ({
    minHeight,
    maxWidth: "100%",
    minWidth: 0,
    flexShrink: 1,
    alignSelf: "flex-start",
    display: "flex",
    alignItems: "center",
    gap: 12,
    paddingBlock: 0,
    paddingInlineStart: 0,
    paddingInlineEnd: 4,
    borderWidth: 0,
    backgroundColor: "transparent",
    color: colors.textPrimary,
    fontFamily: "inherit",
    fontSize: 17,
    fontWeight: 480,
    cursor: "pointer",
    transformOrigin: "left center",
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  }),
  circles: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    paddingInlineStart: 2,
    isolation: "isolate",
  },
  circle: {
    position: "relative",
    flexShrink: 0,
    width: 44,
    height: 44,
    marginInlineStart: -4,
    borderRadius: radii.full,
    boxShadow: `0 0 0 2px ${colors.surfaceCanvas}`,
    display: "grid",
    placeItems: "center",
    fontSize: 15,
    fontWeight: 540,
    fontVariantNumeric: "tabular-nums",
  },
  today: {
    width: 40,
    height: 40,
    marginInlineStart: -12,
    fontSize: 14,
  },
  first: {
    marginInlineStart: 0,
  },
  order: (zIndex: number) => ({ zIndex }),
  nobody: {
    backgroundColor: colors.borderHairline,
  },
  more: {
    backgroundColor: colors.surfaceSoft,
  },
  label: {
    minWidth: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});

const MORE_LAYER = 20;

export function WhoStack({ shown, max, size, label, name, more, onOpen, ref }: WhoStackProps) {
  const stack = stackCircles(shown, max);

  const today = size === "today";

  const circle = (index: number) => [
    styles.circle,
    today && styles.today,
    index === 0 && styles.first,
    styles.order(index + 1),
  ];

  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="dialog"
      aria-label={name}
      onClick={onOpen}
      {...stylex.props(styles.button(HEIGHT[size]), press.scale)}
    >
      <span aria-hidden="true" {...stylex.props(styles.circles)}>
        {shown.length === 0 && <span {...stylex.props(circle(0), styles.nobody)} />}
        {stack.shown.map((tag, index) => (
          <span key={tag.id} {...stylex.props(circle(index), tagFills[tag.color])}>
            {!today && initials(tag.name)}
          </span>
        ))}
        {stack.more > 0 && (
          <span
            {...stylex.props(circle(stack.shown.length), styles.order(MORE_LAYER), styles.more)}
          >
            {more(stack.more)}
          </span>
        )}
      </span>
      <span {...stylex.props(styles.label)}>{label}</span>
      <Icon icon={ChevronDown} size={18} strokeWidth={2} />
    </button>
  );
}
