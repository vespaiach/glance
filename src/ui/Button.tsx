import * as stylex from "@stylexjs/stylex";
import type { LucideIcon } from "lucide-react";
import type { ComponentPropsWithRef } from "react";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii, sizes } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Icon } from "./Icon";
import { press } from "./press";

type ButtonVariant = "primary" | "secondary" | "ghost" | "accent" | "inverse" | "danger";
type ButtonSize = "md" | "lg";

type ButtonProps = Omit<ComponentPropsWithRef<"button">, "style" | "className"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  fullWidth?: boolean;
  xstyle?: stylex.StyleXStyles;
};

const ICON_SIZE: Record<ButtonSize, number> = { md: 20, lg: 26 };

const styles = stylex.create({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    borderRadius: radii.pill,
    cursor: "pointer",
    fontFamily: type.fontSans,
    fontWeight: type.buttonWeight,
    lineHeight: type.buttonLh,
    letterSpacing: type.buttonLs,
    whiteSpace: "nowrap",
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  },
  md: {
    gap: 8,
    paddingBlock: 10,
    paddingInline: 20,
    fontSize: type.buttonSize,
    minHeight: sizes.touchMin,
  },
  lg: {
    gap: 12,
    paddingBlock: 16,
    paddingInline: 32,
    fontSize: 24,
    minHeight: sizes.touchKiosk,
  },
  secondaryMd: {
    paddingTop: 8,
    paddingBottom: 10,
    paddingInline: 18,
  },
  primary: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
  },
  secondary: {
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
  },
  ghost: {
    backgroundColor: "transparent",
    color: colors.textPrimary,
  },
  accent: {
    backgroundColor: season.accent,
    color: season.onAccent,
    transitionProperty: "transform, background-color, color",
    transitionDuration: `${motion.durPress}, ${motion.durSeason}, ${motion.durSeason}`,
    transitionTimingFunction: `${motion.easeOut}, ${motion.easeInOut}, ${motion.easeInOut}`,
  },
  inverse: {
    backgroundColor: colors.white,
    color: colors.black,
  },
  danger: {
    backgroundColor: colors.danger,
    color: colors.white,
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    cursor: "default",
    opacity: 0.35,
  },
});

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  fullWidth,
  disabled,
  children,
  xstyle,
  ...rest
}: ButtonProps) {
  const iconSize = ICON_SIZE[size];

  return (
    <button
      type="button"
      disabled={disabled}
      {...rest}
      {...stylex.props(
        styles.base,
        styles[size],
        variant === "secondary" && size === "md" && styles.secondaryMd,
        styles[variant],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        press.scale,
        xstyle,
      )}
    >
      {icon && <Icon icon={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon icon={iconRight} size={iconSize} />}
    </button>
  );
}
