import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors, sizes, space } from "@/theme/tokens.stylex";

type TopBarProps = {
  brand?: string;
  center?: ReactNode;
  right?: ReactNode;
  height?: number;
  inverse?: boolean;
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  root: {
    display: "flex",
    alignItems: "center",
    gap: space.lg,
    paddingInline: sizes.kioskGutter,
    boxSizing: "border-box",
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
  },
  height: (height: number) => ({ height }),
  inverse: {
    backgroundColor: colors.surfaceInverse,
    color: colors.textInverse,
  },
  brand: {
    fontSize: 32,
    fontWeight: 540,
    letterSpacing: "-0.8px",
    lineHeight: 1,
  },
  center: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    minWidth: 0,
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: space.xs,
  },
});

export function TopBar({ brand, center, right, height = 88, inverse, xstyle }: TopBarProps) {
  return (
    <div {...stylex.props(styles.root, styles.height(height), inverse && styles.inverse, xstyle)}>
      {brand && <div {...stylex.props(styles.brand)}>{brand}</div>}
      <div {...stylex.props(styles.center)}>{center}</div>
      <div {...stylex.props(styles.right)}>{right}</div>
    </div>
  );
}
