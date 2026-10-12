import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { type } from "@/theme/type.stylex";

type EyebrowProps = {
  children: ReactNode;
  size?: "eyebrow" | "caption";
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  base: {
    fontFamily: type.fontMono,
    textTransform: "uppercase",
    color: "inherit",
    fontWeight: 400,
  },
  eyebrow: {
    fontSize: type.eyebrowSize,
    lineHeight: type.eyebrowLh,
    letterSpacing: type.eyebrowLs,
  },
  caption: {
    fontSize: type.captionSize,
    lineHeight: type.captionLh,
    letterSpacing: type.captionLs,
  },
});

export function Eyebrow({ children, size = "eyebrow", xstyle }: EyebrowProps) {
  return <div {...stylex.props(styles.base, styles[size], xstyle)}>{children}</div>;
}
