import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import type { NoteTone } from "@/domain/schemas";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii, shadows, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";

type StickyNoteProps = {
  children: ReactNode;
  author?: string;
  time?: string;
  tone?: NoteTone;
  rotate?: number;
  width?: number | string;
  minHeight?: number;
  onClick?: () => void;
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  root: {
    borderWidth: 0,
    font: "inherit",
    textAlign: "start",
    boxSizing: "border-box",
    padding: space.lg,
    borderRadius: radii.sm,
    boxShadow: shadows.shadow2,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: space.md,
    color: colors.textPrimary,
    transitionProperty: "background-color, transform",
    transitionDuration: `${motion.durSeason}, ${motion.durBase}`,
    transitionTimingFunction: `${motion.easeInOut}, ${motion.easeOut}`,
  },
  button: { cursor: "pointer" },
  size: (width: number | string, minHeight: number) => ({ width, minHeight }),
  rotate: (degrees: number) => ({ transform: `rotate(${degrees}deg)` }),
  tone1: { backgroundColor: season.block1 },
  tone2: { backgroundColor: season.block2 },
  tone3: { backgroundColor: season.block3 },
  tone4: { backgroundColor: season.block4 },
  soft: { backgroundColor: season.soft },
  text: {
    fontSize: 24,
    fontWeight: 400,
    lineHeight: 1.3,
    letterSpacing: "-0.3px",
    textWrap: "pretty",
  },
  meta: {
    display: "flex",
    justifyContent: "space-between",
    gap: space.xs,
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
  },
});

export function StickyNote({
  children,
  author,
  time,
  tone = 2,
  rotate = 0,
  width = 280,
  minHeight = 220,
  onClick,
  xstyle,
}: StickyNoteProps) {
  const rootStyles = [
    styles.root,
    styles.size(width, minHeight),
    styles.rotate(rotate),
    toneStyle(tone),
  ];

  const content = (
    <>
      <span {...stylex.props(styles.text)}>{children}</span>
      {(author || time) && (
        <span {...stylex.props(styles.meta)}>
          <span>{author}</span>
          <span>{time}</span>
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        {...stylex.props(...rootStyles, styles.button, xstyle)}
      >
        {content}
      </button>
    );
  }

  return <div {...stylex.props(...rootStyles, xstyle)}>{content}</div>;
}

function toneStyle(tone: NoteTone) {
  return typeof tone === "number" ? styles[`tone${tone}`] : styles[tone];
}
