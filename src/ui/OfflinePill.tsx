import * as stylex from "@stylexjs/stylex";
import { WifiOff } from "lucide-react";
import { colors, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Icon } from "./Icon";

type OfflinePillProps = {
  label: string;
  meta?: string;
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  root: {
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    height: 48,
    boxSizing: "border-box",
    paddingInline: "16px 20px",
    borderRadius: radii.full,
    backgroundColor: colors.surfaceInverse,
    color: colors.textInverse,
  },
  label: {
    fontSize: 16,
    fontWeight: 480,
    whiteSpace: "nowrap",
  },
  meta: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
});

export function OfflinePill({ label, meta, xstyle }: OfflinePillProps) {
  return (
    <div role="status" {...stylex.props(styles.root, xstyle)}>
      <Icon icon={WifiOff} size={20} />
      <span {...stylex.props(styles.label)}>{label}</span>
      {meta && <span {...stylex.props(styles.meta)}>{meta}</span>}
    </div>
  );
}
