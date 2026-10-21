import * as stylex from "@stylexjs/stylex";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { copy } from "@/copy";
import type { Clock } from "@/domain/time";
import { colors, motion } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Icon } from "@/ui/Icon";
import { press } from "@/ui/press";

type SpanLinkProps = {
  on: boolean;
  outside: number;
  clock: Clock;
  onToggle: () => void;
};

const styles = stylex.create({
  row: {
    display: "flex",
    justifyContent: "center",
    marginTop: -8,
    marginBottom: -4,
  },
  link: {
    minHeight: 32,
    display: "flex",
    alignItems: "center",
    gap: 4,
    paddingBlock: 0,
    paddingInline: 8,
    borderWidth: 0,
    backgroundColor: "transparent",
    color: colors.textPrimary,
    fontFamily: type.fontSans,
    fontSize: 14,
    fontWeight: 480,
    textDecorationLine: "underline",
    textDecorationThickness: 1,
    textUnderlineOffset: 4,
    cursor: "pointer",
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  },
});

export function SpanLink({ on, outside, clock, onToggle }: SpanLinkProps) {
  return (
    <div {...stylex.props(styles.row)}>
      <button
        type="button"
        aria-pressed={on}
        onClick={onToggle}
        {...stylex.props(styles.link, press.scale)}
      >
        {on ? copy.calendar.showDayHours(clock) : copy.calendar.showAllHours(outside)}
        <Icon icon={on ? ChevronsDownUp : ChevronsUpDown} size={14} />
      </button>
    </div>
  );
}
