import * as stylex from "@stylexjs/stylex";
import { radii, space } from "@/theme/tokens.stylex";

export const tile = stylex.create({
  root: {
    borderRadius: radii.lg,
    padding: "clamp(24px, 2.4vw, 32px)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: space.md,
  },
  start: {
    alignItems: "flex-start",
  },
  text: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: 340,
    letterSpacing: "-0.4px",
    lineHeight: 1.15,
  },
  body: {
    fontSize: 17,
    fontWeight: 330,
    lineHeight: 1.45,
    maxWidth: 420,
    textWrap: "pretty",
  },
});
