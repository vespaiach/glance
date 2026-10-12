import * as stylex from "@stylexjs/stylex";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { season } from "@/theme/seasons.stylex";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "./Button";
import { Icon } from "./Icon";

export type BannerTone = 1 | 2 | 3 | 4 | "soft";

type BannerProps = {
  title: ReactNode;
  icon?: LucideIcon;
  body?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  tone?: BannerTone;
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  root: {
    borderRadius: radii.md,
    paddingBlock: space.md,
    paddingInline: space.lg,
    display: "flex",
    alignItems: "center",
    gap: space.md,
    color: colors.textPrimary,
  },
  tone1: { backgroundColor: season.block1 },
  tone2: { backgroundColor: season.block2 },
  tone3: { backgroundColor: season.block3 },
  tone4: { backgroundColor: season.block4 },
  soft: { backgroundColor: season.soft },
  text: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 540,
    letterSpacing: "-0.14px",
    lineHeight: 1.3,
  },
  body: {
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
    lineHeight: type.bodySmLh,
  },
});

function toneStyle(tone: BannerTone) {
  return typeof tone === "number" ? styles[`tone${tone}`] : styles[tone];
}

export function Banner({
  title,
  icon,
  body,
  actionLabel,
  onAction,
  tone = 4,
  xstyle,
}: BannerProps) {
  return (
    <div {...stylex.props(styles.root, toneStyle(tone), xstyle)}>
      {icon && <Icon icon={icon} size={28} />}
      <div {...stylex.props(styles.text)}>
        <div {...stylex.props(styles.title)}>{title}</div>
        {body && <div {...stylex.props(styles.body)}>{body}</div>}
      </div>
      {actionLabel && (
        <Button variant="accent" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
