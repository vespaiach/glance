import * as stylex from "@stylexjs/stylex";
import { ArrowRight, Bell, BellRing } from "lucide-react";
import type { MouseEvent } from "react";
import type { TagColor } from "@/domain/schemas";
import { colors, radii, shadows } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { PersonDot } from "./PersonDot";

type ReminderStripProps = {
  atStart: boolean;
  color: TagColor | "soft";
  eyebrow: string;
  title: string;
  label: string;
  actionLabel: string;
  left?: number;
  onOpen: () => void;
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  root: {
    boxSizing: "border-box",
    width: "100%",
    maxWidth: 960,
    overflow: "hidden",
    borderRadius: radii.lg,
    backgroundColor: colors.black,
    color: colors.white,
    boxShadow: shadows.shadow3,
    cursor: "pointer",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    paddingBlock: 16,
    paddingInline: "28px 16px",
  },
  text: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  eyebrow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontFamily: type.fontMono,
    fontSize: 16,
    lineHeight: 1.2,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  oneLine: {
    minWidth: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  title: {
    fontSize: 28,
    fontWeight: 540,
    lineHeight: 1.15,
    letterSpacing: "-0.4px",
  },
  track: {
    height: 4,
    backgroundColor: colors.onInverseSoft,
  },
  fill: {
    height: "100%",
    backgroundColor: colors.white,
    transformOrigin: "left",
    transitionProperty: "transform",
    transitionDuration: { default: "1s", "@media (prefers-reduced-motion: reduce)": "0s" },
    transitionTimingFunction: "linear",
  },
  left: (left: number) => ({ transform: `scaleX(${left})` }),
});

export function ReminderStrip({
  atStart,
  color,
  eyebrow,
  title,
  label,
  actionLabel,
  left = 1,
  onOpen,
  xstyle,
}: ReminderStripProps) {
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the strip stays out of the focus order (NOTIF-05); the tap is a pointer shortcut for Details
    <div
      role="status"
      aria-label={label}
      onClick={onOpen}
      onMouseDown={keepFocus}
      {...stylex.props(styles.root, xstyle)}
    >
      <div {...stylex.props(styles.row)}>
        <Icon icon={atStart ? BellRing : Bell} size={28} />
        <div {...stylex.props(styles.text)}>
          <span {...stylex.props(styles.eyebrow)}>
            <PersonDot color={color} />
            <span {...stylex.props(styles.oneLine)}>{eyebrow}</span>
          </span>
          <span {...stylex.props(styles.title, styles.oneLine)}>{title}</span>
        </div>
        <Button variant="inverse" iconRight={ArrowRight} tabIndex={-1}>
          {actionLabel}
        </Button>
      </div>
      <div {...stylex.props(styles.track)}>
        <div {...stylex.props(styles.fill, styles.left(left))} />
      </div>
    </div>
  );
}

function keepFocus(event: MouseEvent) {
  event.preventDefault();
}
