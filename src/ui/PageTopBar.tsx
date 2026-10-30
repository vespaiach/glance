import * as stylex from "@stylexjs/stylex";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { colors } from "@/theme/tokens.stylex";
import { IconButton } from "./IconButton";

type PageTopBarProps = {
  backLabel: string;
  backIcon?: LucideIcon;
  backDisabled?: boolean;
  onBack?: () => void;
  title?: ReactNode;
  compact?: boolean;
  children?: ReactNode;
};

const styles = stylex.create({
  bar: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    flexShrink: 0,
    minWidth: 0,
    minHeight: 88,
    boxSizing: "border-box",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "12px 16px",
    paddingBlock: 12,
    paddingInline: "clamp(16px, 3vw, 40px)",
    backgroundColor: colors.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.borderHairline,
    color: colors.textPrimary,
  },
  title: {
    minWidth: 0,
    marginRight: "auto",
    fontSize: "clamp(22px, 2vw, 28px)",
    fontWeight: 540,
    letterSpacing: "-0.4px",
    lineHeight: 1.1,
    whiteSpace: "nowrap",
  },
  compactBar: {
    minHeight: 56,
    gap: 8,
    paddingBlock: 8,
    paddingInline: 12,
  },
  compactTitle: {
    fontSize: 20,
  },
});

export function PageTopBar({
  backLabel,
  backIcon = ChevronLeft,
  backDisabled,
  onBack,
  title,
  compact,
  children,
}: PageTopBarProps) {
  return (
    <div data-page-top-bar {...stylex.props(styles.bar, compact && styles.compactBar)}>
      {onBack && (
        <IconButton
          icon={backIcon}
          label={backLabel}
          variant="canvas"
          size={compact ? "md" : "touch"}
          disabled={backDisabled}
          onClick={onBack}
        />
      )}
      {title && (
        <span {...stylex.props(styles.title, compact && styles.compactTitle)}>{title}</span>
      )}
      {children}
    </div>
  );
}
