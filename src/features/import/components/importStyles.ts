import * as stylex from "@stylexjs/stylex";
import { colors, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";

export const panel = stylex.create({
  grid: {
    flexGrow: 1,
    display: "grid",
    gap: 24,
  },
  card: {
    minWidth: 0,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 20,
    padding: "clamp(24px, 3vw, 40px)",
    borderRadius: 24,
    backgroundColor: colors.surfaceCanvas,
  },
  headline: {
    margin: 0,
    fontSize: "clamp(32px, 3.4vw, 48px)",
    fontWeight: 540,
    letterSpacing: "-0.9px",
    lineHeight: 1.05,
    textWrap: "pretty",
  },
  body: {
    margin: 0,
    fontSize: "clamp(17px, 1.4vw, 20px)",
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  mono: {
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
  },
  softTile: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px 16px",
    paddingBlock: 12,
    paddingLeft: 16,
    paddingRight: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
  },
  spacer: {
    flexGrow: 1,
  },
  round: (size: string) => ({
    width: size,
    height: size,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: radii.full,
  }),
  onCanvas: {
    backgroundColor: colors.surfaceCanvas,
  },
  onSoft: {
    backgroundColor: colors.surfaceSoft,
  },
});
