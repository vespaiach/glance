import type { LucideIcon } from "lucide-react";

const LARGE_ICON_SIZE = 48;

type IconProps = {
  icon: LucideIcon;
  size?: number;
  strokeWidth?: number;
  label?: string;
};

export function Icon({
  icon: Glyph,
  size = 24,
  strokeWidth = defaultStroke(size),
  label,
}: IconProps) {
  const naming = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };

  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      color="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...naming}
    />
  );
}

function defaultStroke(size: number) {
  return size >= LARGE_ICON_SIZE ? 1.5 : 1.75;
}
