import * as stylex from "@stylexjs/stylex";
import { ChevronRight } from "lucide-react";
import { type ReactNode, useId } from "react";
import { colors, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Icon } from "./Icon";
import { SwitchTrack } from "./Switch";

type SettingsRowProps = {
  title: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  align?: "center" | "start";
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
  start: {
    alignItems: "flex-start",
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
  textStart: {
    paddingTop: 12,
  },
  title: {
    fontSize: type.headlineSize,
    fontWeight: type.headlineWeight,
    letterSpacing: type.headlineLs,
  },
  description: {
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
    textWrap: "pretty",
  },
  status: {
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    lineHeight: 1.3,
  },
  control: {
    maxWidth: "100%",
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
  status,
  children,
  onClick,
  checked,
  onCheckedChange,
  align = "center",
  divider = true,
  xstyle,
}: SettingsRowProps) {
  const id = useId();

  const rowStyles = [styles.root, align === "start" && styles.start, divider && styles.divider];

  const text = (
    <span {...stylex.props(styles.text, align === "start" && styles.textStart)}>
      <span id={`${id}-title`} {...stylex.props(styles.title)}>
        {title}
      </span>
      {description && (
        <span id={`${id}-description`} {...stylex.props(styles.description)}>
          {description}
        </span>
      )}
      {status !== undefined && (
        <span role="status" aria-live="polite" {...stylex.props(styles.status)}>
          {status}
        </span>
      )}
    </span>
  );

  if (onCheckedChange) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked ?? false}
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-description` : undefined}
        onClick={() => onCheckedChange(!checked)}
        {...stylex.props(...rowStyles, styles.button, xstyle)}
      >
        {text}
        <SwitchTrack checked={checked ?? false} />
      </button>
    );
  }

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
