import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors, radii, shadows, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";

type CardVariant = "hairline" | "soft" | "canvas" | "elevated";

type CardProps = {
  variant?: CardVariant;
  eyebrow?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  base: {
    color: colors.textPrimary,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: space.sm,
  },
  button: {
    borderWidth: 0,
    textAlign: "start",
    font: "inherit",
    cursor: "pointer",
  },
  hairline: {
    backgroundColor: colors.surfaceCanvas,
    boxShadow: shadows.shadow1,
    borderRadius: radii.lg,
    padding: space.lg,
  },
  soft: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    padding: space.md,
  },
  canvas: {
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.md,
    padding: space.lg,
  },
  elevated: {
    backgroundColor: colors.surfaceCanvas,
    boxShadow: shadows.shadow2,
    borderRadius: radii.md,
    padding: space.lg,
  },
  eyebrow: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
  },
  title: {
    fontSize: type.cardTitleSize,
    fontWeight: type.cardTitleWeight,
    lineHeight: type.cardTitleLh,
  },
});

export function Card({
  variant = "hairline",
  eyebrow,
  title,
  children,
  onClick,
  xstyle,
}: CardProps) {
  const content = (
    <>
      {eyebrow && <div {...stylex.props(styles.eyebrow)}>{eyebrow}</div>}
      {title && <div {...stylex.props(styles.title)}>{title}</div>}
      {children}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        {...stylex.props(styles.base, styles.button, styles[variant], xstyle)}
      >
        {content}
      </button>
    );
  }

  return <div {...stylex.props(styles.base, styles[variant], xstyle)}>{content}</div>;
}
