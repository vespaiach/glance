import * as stylex from "@stylexjs/stylex";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { colors, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Icon } from "./Icon";

type SettingsRowProps = {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  divider?: boolean;
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  root: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: `${space.sm} ${space.lg}`,
    paddingBlock: 20,
    color: colors.textPrimary,
  },
  divider: {
    boxShadow: `inset 0 -1px 0 ${colors.borderHairlineSoft}`,
  },
  button: {
    width: "100%",
    borderWidth: 0,
    paddingInline: 0,
    backgroundColor: "transparent",
    font: "inherit",
    textAlign: "start",
    cursor: "pointer",
  },
  text: {
    display: "flex",
    flexDirection: "column",
    gap: space.xxs,
    minWidth: 180,
  },
  title: {
    fontSize: type.headlineSize,
    fontWeight: type.headlineWeight,
    letterSpacing: type.headlineLs,
  },
  description: {
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
  },
  control: {
    maxWidth: "100%",
    overflowX: "auto",
    display: "flex",
  },
  link: {
    display: "flex",
    alignItems: "center",
    gap: space.xs,
    fontSize: 17,
    fontWeight: 330,
  },
});

export function SettingsRow({
  title,
  description,
  children,
  onClick,
  divider = true,
  xstyle,
}: SettingsRowProps) {
  const rowStyles = [styles.root, divider && styles.divider];

  const text = (
    <span {...stylex.props(styles.text)}>
      <span {...stylex.props(styles.title)}>{title}</span>
      {description && <span {...stylex.props(styles.description)}>{description}</span>}
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        {...stylex.props(...rowStyles, styles.button, xstyle)}
      >
        {text}
        <span {...stylex.props(styles.link)}>
          {children}
          <Icon icon={ChevronRight} size={22} />
        </span>
      </button>
    );
  }

  return (
    <div {...stylex.props(...rowStyles, xstyle)}>
      {text}
      <div {...stylex.props(styles.control)}>{children}</div>
    </div>
  );
}
