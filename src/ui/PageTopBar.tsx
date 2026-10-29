import * as stylex from "@stylexjs/stylex";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { colors } from "@/theme/tokens.stylex";
import { IconButton } from "./IconButton";

type PageTopBarProps = {
  backLabel: string;
  onBack?: () => void;
  title?: ReactNode;
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
});

export function PageTopBar({ backLabel, onBack, title, children }: PageTopBarProps) {
  return (
    <div data-page-top-bar {...stylex.props(styles.bar)}>
      {onBack && (
        <IconButton
          icon={ChevronLeft}
          label={backLabel}
          variant="canvas"
          size="touch"
          onClick={onBack}
        />
      )}
      {title && <span {...stylex.props(styles.title)}>{title}</span>}
      {children}
    </div>
  );
}
