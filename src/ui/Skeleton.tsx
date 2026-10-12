import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors, radii } from "@/theme/tokens.stylex";

type SkeletonProps = {
  label: string;
  children: ReactNode;
  xstyle?: stylex.StyleXStyles;
};

type SkeletonBlockProps = {
  width?: number | string;
  height: number | string;
  radius?: string;
  xstyle?: stylex.StyleXStyles;
};

const pulse = stylex.keyframes({
  from: { opacity: 1 },
  to: { opacity: 0.6 },
});

const styles = stylex.create({
  group: {
    animationName: pulse,
    animationDuration: "1.2s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
    animationDirection: "alternate",
  },
  block: {
    backgroundColor: colors.black,
    opacity: 0.1,
    borderRadius: radii.xs,
    flexShrink: 0,
  },
  size: (width: number | string, height: number | string) => ({ width, height }),
  radius: (borderRadius: string) => ({ borderRadius }),
});

export function Skeleton({ label, children, xstyle }: SkeletonProps) {
  return (
    <div role="status" aria-label={label} aria-busy="true" {...stylex.props(styles.group, xstyle)}>
      {children}
    </div>
  );
}

export function SkeletonBlock({ width = "100%", height, radius, xstyle }: SkeletonBlockProps) {
  return (
    <div
      aria-hidden="true"
      {...stylex.props(
        styles.block,
        styles.size(width, height),
        radius !== undefined && styles.radius(radius),
        xstyle,
      )}
    />
  );
}
