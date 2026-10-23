import * as stylex from "@stylexjs/stylex";
import { Plus } from "lucide-react";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii, shadows } from "@/theme/tokens.stylex";
import { Icon } from "./Icon";
import { press } from "./press";

type NotePadSize = "sm" | "lg";

type NotePadProps = {
  label?: string;
  onClick?: () => void;
  size?: NotePadSize;
  xstyle?: stylex.StyleXStyles;
};

type Dimensions = {
  width: number;
  height: number;
  padding: number;
  ruleGap: number;
  button: number;
  glyph: number;
};

const DIMENSIONS: Record<NotePadSize, Dimensions> = {
  sm: { width: 128, height: 116, padding: 15, ruleGap: 13, button: 40, glyph: 20 },
  lg: { width: 220, height: 200, padding: 26, ruleGap: 22, button: 56, glyph: 28 },
};

const styles = stylex.create({
  root: {
    position: "relative",
    display: "inline-block",
    flexShrink: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    padding: 0,
    font: "inherit",
    color: "inherit",
    cursor: "pointer",
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  },
  size: (width: number, height: number) => ({ width, height }),
  sheet: {
    position: "absolute",
    inset: 0,
    borderRadius: radii.sm,
    transitionProperty: "background-color",
    transitionDuration: motion.durSeason,
    transitionTimingFunction: motion.easeInOut,
  },
  back: {
    backgroundColor: season.block4,
    transform: "rotate(7deg) translate(6px, 4px)",
  },
  middle: {
    backgroundColor: season.block3,
    transform: "rotate(-5deg) translate(-4px, 2px)",
  },
  top: {
    backgroundColor: season.block2,
    transform: "rotate(-1.5deg)",
    boxShadow: shadows.shadow2,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  padding: (padding: number) => ({ padding }),
  rules: (gap: number) => ({
    display: "flex",
    flexDirection: "column",
    gap,
  }),
  rule: {
    height: 1,
    backgroundColor: "rgba(0,0,0,.14)",
  },
  short: { width: "60%" },
  plus: (size: number) => ({
    width: size,
    height: size,
    alignSelf: "flex-end",
    borderRadius: radii.full,
    backgroundColor: colors.surfaceInverse,
    color: colors.textInverse,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }),
});

export function NotePad({ label, onClick, size = "sm", xstyle }: NotePadProps) {
  const { width, height, padding, ruleGap, button, glyph } = DIMENSIONS[size];

  const sheets = (
    <>
      <span {...stylex.props(styles.sheet, styles.back)} />
      <span {...stylex.props(styles.sheet, styles.middle)} />
      <span {...stylex.props(styles.sheet, styles.top, styles.padding(padding))}>
        <span {...stylex.props(styles.rules(ruleGap))}>
          <span {...stylex.props(styles.rule)} />
          <span {...stylex.props(styles.rule)} />
          <span {...stylex.props(styles.rule, styles.short)} />
        </span>
        {onClick && (
          <span {...stylex.props(styles.plus(button))}>
            <Icon icon={Plus} size={glyph} />
          </span>
        )}
      </span>
    </>
  );

  if (onClick === undefined) {
    return (
      <span aria-hidden="true" {...stylex.props(styles.root, styles.size(width, height), xstyle)}>
        {sheets}
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      {...stylex.props(styles.root, styles.size(width, height), press.scale, xstyle)}
    >
      {sheets}
    </button>
  );
}
