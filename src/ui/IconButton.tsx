import * as stylex from "@stylexjs/stylex";
import type { LucideIcon } from "lucide-react";
import type { Ref } from "react";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { Icon } from "./Icon";
import { press } from "./press";

type IconButtonVariant = "soft" | "canvas" | "solid" | "inverse";
type IconButtonSize = "md" | "touch" | "lg";

type IconButtonProps = {
  icon: LucideIcon;
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  active?: boolean;
  current?: "page";
  expanded?: boolean;
  onClick?: () => void;
  ref?: Ref<HTMLButtonElement>;
  xstyle?: stylex.StyleXStyles;
};

const PIXELS: Record<IconButtonSize, number> = { md: 40, touch: 56, lg: 72 };

const GLYPH_RATIO = 0.45;

const styles = stylex.create({
  base: {
    borderWidth: 0,
    borderRadius: radii.full,
    display: "inline-grid",
    placeItems: "center",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
    transitionProperty: "transform, background-color",
    transitionDuration: `${motion.durPress}, ${motion.durFast}`,
    transitionTimingFunction: motion.easeOut,
  },
  md: { width: 40, height: 40 },
  touch: { width: 56, height: 56 },
  lg: { width: 72, height: 72 },
  soft: {
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
  },
  canvas: {
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
  },
  solid: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
  },
  inverse: {
    backgroundColor: colors.onInverseSoft,
    color: colors.textInverse,
  },
});

export function IconButton({
  icon,
  label,
  variant = "soft",
  size = "md",
  active,
  current,
  expanded,
  onClick,
  ref,
  xstyle,
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-current={current}
      aria-pressed={active}
      aria-expanded={expanded}
      onClick={onClick}
      {...stylex.props(
        styles.base,
        styles[size],
        styles[active ? "solid" : variant],
        press.scale,
        xstyle,
      )}
    >
      <Icon icon={icon} size={Math.round(PIXELS[size] * GLYPH_RATIO)} />
    </button>
  );
}
