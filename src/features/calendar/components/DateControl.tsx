import * as stylex from "@stylexjs/stylex";
import { ChevronDown } from "lucide-react";
import { copy } from "@/copy";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Icon } from "@/ui/Icon";
import { press } from "@/ui/press";

type DateControlProps = {
  year: string;
  month: string;
  weekday: string;
  date: number;
  name: string;
  onOpen: () => void;
};

const styles = stylex.create({
  root: {
    flexShrink: 0,
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    boxSizing: "border-box",
    paddingBlock: 12,
    paddingInlineStart: 24,
    paddingInlineEnd: 12,
    borderWidth: 0,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
    font: "inherit",
    textAlign: "start",
    cursor: "pointer",
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  },
  heading: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },
  year: {
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.54px",
    textTransform: "uppercase",
  },
  month: {
    fontSize: 28,
    fontWeight: 340,
    letterSpacing: "-0.4px",
    lineHeight: 1.1,
  },
  pill: {
    flexShrink: 0,
    height: 60,
    display: "flex",
    alignItems: "center",
    gap: 12,
    paddingInlineStart: 22,
    paddingInlineEnd: 16,
    borderRadius: radii.full,
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
  },
  day: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
  },
  weekday: {
    fontFamily: type.fontMono,
    fontSize: 13,
    letterSpacing: "0.54px",
    textTransform: "uppercase",
  },
  date: {
    fontSize: 22,
    fontWeight: 480,
    letterSpacing: "-0.5px",
    lineHeight: 1,
  },
});

export function DateControl({ year, month, weekday, date, name, onOpen }: DateControlProps) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={copy.calendar.pickDateFor(name)}
      onClick={onOpen}
      {...stylex.props(styles.root, press.scale)}
    >
      <span {...stylex.props(styles.heading)}>
        <span {...stylex.props(styles.year)}>{year}</span>
        <span {...stylex.props(styles.month)}>{month}</span>
      </span>
      <span {...stylex.props(styles.pill)}>
        <span {...stylex.props(styles.day)}>
          <span {...stylex.props(styles.weekday)}>{weekday}</span>
          <span {...stylex.props(styles.date)}>{date}</span>
        </span>
        <Icon icon={ChevronDown} size={24} />
      </span>
    </button>
  );
}
