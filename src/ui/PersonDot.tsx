import * as stylex from "@stylexjs/stylex";
import type { MemberColor } from "@/domain/schemas";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii } from "@/theme/tokens.stylex";

type PersonDotProps = {
  color: MemberColor | "soft";
  size?: "sm" | "md" | "lg";
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
});

export function PersonDot({ color, size = "md" }: PersonDotProps) {
  return (
    <span
      aria-hidden="true"
      {...stylex.props(styles.dot, size !== "md" && styles[size], styles[color])}
    />
  );
}
