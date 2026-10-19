import * as stylex from "@stylexjs/stylex";
import type { ComponentPropsWithoutRef } from "react";
import type { MemberColor } from "@/domain/schemas";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii, space } from "@/theme/tokens.stylex";

export type BlockTone = 1 | 2 | 3 | 4 | "soft" | "deep" | "canvas" | "ink" | MemberColor;

type ColorBlockProps = Omit<ComponentPropsWithoutRef<"section">, "style" | "className"> & {
  tone?: BlockTone;
  padding?: string;
  radius?: string;
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  base: {
    color: colors.textPrimary,
    borderRadius: radii.lg,
    padding: space.xxl,
    boxSizing: "border-box",
    transitionProperty: "background-color",
    transitionDuration: motion.durSeason,
    transitionTimingFunction: motion.easeInOut,
  },
  tone1: { backgroundColor: season.block1 },
  tone2: { backgroundColor: season.block2 },
  tone3: { backgroundColor: season.block3 },
  tone4: { backgroundColor: season.block4 },
  soft: { backgroundColor: season.soft },
  deep: { backgroundColor: season.deep, color: season.onDeep },
  canvas: { backgroundColor: colors.surfaceCanvas },
  ink: { backgroundColor: colors.surfaceInverse, color: colors.textInverse },
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
  padding: (padding: string) => ({ padding }),
  radius: (radius: string) => ({ borderRadius: radius }),
});

export function ColorBlock({
  tone = 1,
  padding,
  radius,
  children,
  xstyle,
  ...rest
}: ColorBlockProps) {
  return (
    <section
      {...rest}
      {...stylex.props(
        styles.base,
        toneStyle(tone),
        padding !== undefined && styles.padding(padding),
        radius !== undefined && styles.radius(radius),
        xstyle,
      )}
    >
      {children}
    </section>
  );
}

function toneStyle(tone: BlockTone) {
  return typeof tone === "number" ? styles[`tone${tone}`] : styles[tone];
}
