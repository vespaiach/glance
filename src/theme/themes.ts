import * as stylex from "@stylexjs/stylex";
import { season } from "./seasons.stylex";
import { colors } from "./tokens.stylex";
import { type } from "./type.stylex";

export const summer = stylex.createTheme(season, {
  block1: colors.blockSun,
  block2: colors.blockCoral,
  block3: colors.blockSky,
  block4: colors.blockLime,
  soft: colors.blockCream,
  deep: colors.blockSea,
  onDeep: colors.white,
  accent: colors.accentTangerine,
  onAccent: colors.black,
});

export const fall = stylex.createTheme(season, {
  block1: colors.blockAmber,
  block2: colors.blockRust,
  block3: colors.blockSage,
  block4: colors.blockCoral,
  soft: colors.blockCream,
  deep: colors.blockBark,
  onDeep: colors.white,
  accent: colors.accentEmber,
  onAccent: colors.black,
});

export const winter = stylex.createTheme(season, {
  block1: colors.blockIce,
  block2: colors.blockLilac,
  block3: colors.blockGlacier,
  block4: colors.blockMint,
  soft: colors.blockFrost,
  deep: colors.blockMidnight,
  onDeep: colors.white,
  accent: colors.accentCobalt,
  onAccent: colors.white,
});

export const ambientType = stylex.createTheme(type, {
  clockSize: "clamp(84px, min(19vw, 30vh), 300px)",
  clockLs: "-8px",
  eyebrowSize: "clamp(14px, 1.4vw, 20px)",
  captionSize: "16px",
});
