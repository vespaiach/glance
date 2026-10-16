import * as stylex from "@stylexjs/stylex";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useId } from "react";
import { type Clock, formatClock, formatLength, timeParts } from "@/domain/time";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Icon } from "./Icon";
import { press } from "./press";

type TimeFieldLabels = {
  noEnd: string;
  change: string;
};

type TimeFieldProps = {
  label: string;
  value: number | undefined;
  clock: Clock;
  length?: number;
  open: boolean;
  error?: string;
  labels: TimeFieldLabels;
  onToggle: () => void;
  compact?: boolean;
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
  },
  label: {
    fontSize: type.bodyLgSize,
    fontWeight: type.bodyLgWeight,
    letterSpacing: type.bodyLgLs,
  },
  length: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  button: {
    minHeight: 56,
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingBlock: 10,
    paddingLeft: 14,
    paddingRight: 12,
    boxSizing: "border-box",
    backgroundColor: colors.surfaceCanvas,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.borderHairline,
    borderRadius: radii.md,
    boxShadow: "none",
    fontFamily: type.fontSans,
    color: colors.textPrimary,
    cursor: "pointer",
    textAlign: "left",
    transitionProperty: "transform, box-shadow",
    transitionDuration: `${motion.durPress}, ${motion.durFast}`,
    transitionTimingFunction: motion.easeOut,
  },
  open: {
    borderColor: colors.black,
    boxShadow: `0 0 0 2px ${colors.focusRing}`,
  },
  invalid: {
    borderColor: colors.danger,
  },
  invalidOpen: {
    boxShadow: `0 0 0 2px ${colors.danger}`,
  },
  reading: {
    display: "flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 8,
    minWidth: 0,
  },
  time: {
    fontSize: 22,
    fontWeight: 340,
    letterSpacing: "-0.2px",
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1.2,
  },
  compactTime: {
    fontSize: 19,
  },
  empty: {
    fontWeight: 330,
  },
  meridiem: {
    fontFamily: type.fontMono,
    fontSize: 15,
    letterSpacing: "0.5px",
  },
  error: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
    color: colors.danger,
  },
});

function spokenTime(value: number | undefined, clock: Clock, noEnd: string) {
  return value === undefined ? noEnd : formatClock(value, clock);
}

export function TimeField({
  label,
  value,
  clock,
  length,
  open,
  error,
  labels,
  onToggle,
  compact,
  xstyle,
}: TimeFieldProps) {
  const errorId = useId();

  const invalid = Boolean(error);

  const reading = value === undefined ? { time: labels.noEnd } : timeParts(value, clock);

  const ariaLabel = `${label}, ${spokenTime(value, clock, labels.noEnd)}. ${labels.change}`;

  return (
    <div {...stylex.props(styles.root, xstyle)}>
      <div {...stylex.props(styles.header)}>
        <span {...stylex.props(styles.label)}>{label}</span>
        {length !== undefined && (
          <span {...stylex.props(styles.length)}>{formatLength(length)}</span>
        )}
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-describedby={invalid ? errorId : undefined}
        onClick={onToggle}
        {...stylex.props(
          styles.button,
          open && styles.open,
          invalid && styles.invalid,
          invalid && open && styles.invalidOpen,
          press.scale,
        )}
      >
        <span {...stylex.props(styles.reading)}>
          <span
            {...stylex.props(
              styles.time,
              compact && styles.compactTime,
              value === undefined && styles.empty,
            )}
          >
            {reading.time}
          </span>
          {reading.meridiem && <span {...stylex.props(styles.meridiem)}>{reading.meridiem}</span>}
        </span>
        <Icon icon={open ? ChevronUp : ChevronDown} size={20} />
      </button>
      {invalid && (
        <span id={errorId} role="alert" {...stylex.props(styles.error)}>
          {error}
        </span>
      )}
    </div>
  );
}
