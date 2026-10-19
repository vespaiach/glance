import * as stylex from "@stylexjs/stylex";
import type { MemberColor } from "@/domain/schemas";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii } from "@/theme/tokens.stylex";

type PersonDotProps = {
  color: MemberColor | "soft";
  size?: "xs" | "xsm" | "sm" | "md" | "lg";
  hollow?: boolean;
};

const styles = stylex.create({
  dot: {
    flexShrink: 0,
    width: 12,
    height: 12,
    borderRadius: radii.full,
    transitionProperty: "background-color",
    transitionDuration: motion.durSeason,
    transitionTimingFunction: motion.easeInOut,
  },
  xs: {
    width: 6,
    height: 6,
  },
  xsm: {
    width: 8,
    height: 8,
  },
  sm: {
    width: 10,
    height: 10,
  },
  lg: {
    width: 20,
    height: 20,
  },
  soft: { backgroundColor: season.soft },
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
  hollow: {
    backgroundColor: "transparent",
    borderWidth: 3,
    borderStyle: "solid",
    boxSizing: "border-box",
  },
});

const rings = stylex.create({
  soft: { borderColor: season.soft },
  lilac: { borderColor: colors.blockLilac },
  sky: { borderColor: colors.blockSky },
  coral: { borderColor: colors.blockCoral },
  mint: { borderColor: colors.blockMint },
  sun: { borderColor: colors.blockSun },
  pink: { borderColor: colors.blockPink },
  lime: { borderColor: colors.blockLime },
  rust: { borderColor: colors.blockRust },
  glacier: { borderColor: colors.blockGlacier },
  amber: { borderColor: colors.blockAmber },
  sage: { borderColor: colors.blockSage },
  ice: { borderColor: colors.blockIce },
});

export function PersonDot({ color, size = "md", hollow = false }: PersonDotProps) {
  return (
    <span
      aria-hidden="true"
      {...stylex.props(
        styles.dot,
        size !== "md" && styles[size],
        styles[color],
        hollow && [styles.hollow, rings[color]],
      )}
    />
  );
}
