import * as stylex from "@stylexjs/stylex";
import type { EventStatus } from "@/domain/eventStatus";
import type { Tone } from "@/domain/schemas";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { press } from "./press";

type EventRowProps = {
  start: string;
  end?: string;
  title: string;
  location?: string;
  status: EventStatus;
  dot?: Tone;
  nowLabel: string;
  compact?: boolean;
  onClick?: () => void;
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  row: {
    display: "grid",
    gridTemplateColumns: "84px 14px minmax(0,1fr) auto",
    alignItems: "center",
    columnGap: space.lg,
    paddingBlock: 14,
    paddingInline: space.md,
    borderRadius: radii.md,
    backgroundColor: "transparent",
    boxShadow: `inset 0 -1px 0 ${colors.borderHairlineSoft}`,
    color: colors.textPrimary,
    boxSizing: "border-box",
    width: "100%",
  },
  compact: {
    gridTemplateColumns: "56px 10px minmax(0,1fr) auto",
    columnGap: space.sm,
    paddingBlock: space.sm,
    paddingInline: space.xs,
  },
  button: {
    borderWidth: 0,
    font: "inherit",
    textAlign: "start",
    cursor: "pointer",
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  },
  now: {
    backgroundColor: season.block1,
    boxShadow: "none",
  },
  times: {
    display: "flex",
    flexDirection: "column",
    gap: space.xxs,
    fontFamily: type.fontMono,
    letterSpacing: "0.54px",
  },
  start: { fontSize: 20 },
  end: {
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: radii.full,
  },
  dotCompact: { width: 10, height: 10 },
  tone1: { backgroundColor: season.block1 },
  tone2: { backgroundColor: season.block2 },
  tone3: { backgroundColor: season.block3 },
  tone4: { backgroundColor: season.block4 },
  soft: { backgroundColor: season.soft },
  accent: { backgroundColor: season.accent },
  pastDot: { backgroundColor: colors.borderHairline },
  text: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontSize: type.headlineSize,
    fontWeight: type.headlineWeight,
    letterSpacing: type.headlineLs,
    lineHeight: 1.25,
    textDecoration: "none",
  },
  pastTitle: {
    fontWeight: 340,
    textDecoration: "line-through",
    textDecorationThickness: 1,
  },
  location: {
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
  },
  pill: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
    borderRadius: radii.pill,
    paddingBlock: 6,
    paddingInline: 14,
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
  },
});

function dotStyle(dot: Tone, status: EventStatus) {
  if (status === "past") return styles.pastDot;

  return typeof dot === "number" ? styles[`tone${dot}`] : styles[dot];
}

export function EventRow({
  start,
  end,
  title,
  location,
  status,
  dot = 1,
  nowLabel,
  compact,
  onClick,
  xstyle,
}: EventRowProps) {
  const past = status === "past";
  const Title = past ? "s" : "span";
  const rowStyles = [styles.row, compact && styles.compact, status === "now" && styles.now];

  const content = (
    <>
      <span {...stylex.props(styles.times)}>
        <span {...stylex.props(styles.start)}>{start}</span>
        {end && <span {...stylex.props(styles.end)}>– {end}</span>}
      </span>
      <span
        aria-hidden="true"
        {...stylex.props(styles.dot, compact && styles.dotCompact, dotStyle(dot, status))}
      />
      <span {...stylex.props(styles.text)}>
        <Title {...stylex.props(styles.title, past && styles.pastTitle)}>{title}</Title>
        {location && <span {...stylex.props(styles.location)}>{location}</span>}
      </span>
      {status === "now" && <span {...stylex.props(styles.pill)}>{nowLabel}</span>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        {...stylex.props(...rowStyles, styles.button, press.scale, xstyle)}
      >
        {content}
      </button>
    );
  }

  return <div {...stylex.props(...rowStyles, xstyle)}>{content}</div>;
}
