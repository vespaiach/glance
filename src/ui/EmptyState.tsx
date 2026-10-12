import * as stylex from "@stylexjs/stylex";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { colors, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Eyebrow } from "./Eyebrow";
import { Icon } from "./Icon";

type EmptyStateSize = "md" | "lg";

type EmptyStateProps = {
  icon: LucideIcon;
  title: ReactNode;
  body?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  size?: EmptyStateSize;
  align?: "start" | "center";
  xstyle?: stylex.StyleXStyles;
};

const ICON_SIZE: Record<EmptyStateSize, number> = { md: 48, lg: 64 };

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: space.lg,
    color: colors.textPrimary,
  },
  center: {
    alignItems: "center",
    textAlign: "center",
  },
  text: {
    display: "flex",
    flexDirection: "column",
    alignItems: "inherit",
    gap: 6,
  },
  textLg: { gap: 10 },
  titleMd: {
    fontSize: 28,
    fontWeight: 340,
    letterSpacing: "-0.4px",
    lineHeight: 1.15,
  },
  titleLg: {
    fontSize: type.displayXlSize,
    fontWeight: type.displayXlWeight,
    letterSpacing: type.displayXlLs,
    lineHeight: 1.05,
  },
  body: {
    fontWeight: 330,
    lineHeight: 1.45,
    maxWidth: 520,
    textWrap: "pretty",
  },
  bodyMd: { fontSize: 17 },
  bodyLg: { fontSize: 18 },
});

export function EmptyState({
  icon,
  title,
  body,
  eyebrow,
  action,
  size = "md",
  align = "start",
  xstyle,
}: EmptyStateProps) {
  const large = size === "lg";

  return (
    <div {...stylex.props(styles.root, align === "center" && styles.center, xstyle)}>
      <Icon icon={icon} size={ICON_SIZE[size]} strokeWidth={1.25} />
      <div {...stylex.props(styles.text, large && styles.textLg)}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <div {...stylex.props(large ? styles.titleLg : styles.titleMd)}>{title}</div>
        {body && (
          <div {...stylex.props(styles.body, large ? styles.bodyLg : styles.bodyMd)}>{body}</div>
        )}
      </div>
      {action}
    </div>
  );
}
