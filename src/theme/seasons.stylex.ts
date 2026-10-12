import * as stylex from "@stylexjs/stylex";
import { colors } from "./tokens.stylex";

export const season = stylex.defineVars({
  block1: colors.blockLime,
  block2: colors.blockPink,
  block3: colors.blockMint,
  block4: colors.blockLilac,
  soft: colors.blockCream,
  deep: colors.blockNavy,
  onDeep: colors.white,
  accent: colors.accentMagenta,
  onAccent: colors.white,
});
