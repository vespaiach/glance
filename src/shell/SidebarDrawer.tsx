import * as stylex from "@stylexjs/stylex";
import { X } from "lucide-react";
import { copy } from "@/copy";
import { colors, motion, radii, shadows, space } from "@/theme/tokens.stylex";
import { Icon } from "@/ui/Icon";
import { IconButton } from "@/ui/IconButton";
import { press } from "@/ui/press";
import type { View } from "./routes";
import { SIDEBAR_PINNED, SIDEBAR_VIEWS, type SidebarItem } from "./sidebarItems";

type SidebarDrawerProps = {
  open: boolean;
  active?: View;
  onClose: () => void;
  onNavigate: (path: string) => void;
};

const styles = stylex.create({
  layer: {
    position: "fixed",
    inset: 0,
    zIndex: 4,
    pointerEvents: "none",
  },
  drawer: {
    position: "absolute",
    top: 12,
    bottom: 12,
    left: 12,
    width: 320,
    boxSizing: "border-box",
    paddingTop: 20,
    paddingInline: space.md,
    paddingBottom: space.md,
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.lg,
    boxShadow: shadows.shadow1,
    pointerEvents: "auto",
    display: "flex",
    flexDirection: "column",
    gap: space.xxs,
    overflow: "auto",
    transitionProperty: "transform",
    transitionDuration: motion.durBase,
    transitionTimingFunction: motion.easeSlide,
  },
  closed: {
    transform: "translateX(calc(-100% - 24px))",
    pointerEvents: "none",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.md,
    paddingTop: 0,
    paddingRight: space.xxs,
    paddingBottom: space.sm,
    paddingLeft: space.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 540,
    letterSpacing: "-0.3px",
  },
  row: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: space.md,
    height: 64,
    paddingBlock: 0,
    paddingInline: space.lg,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: "transparent",
    color: colors.textPrimary,
    fontFamily: "inherit",
    fontSize: 20,
    fontWeight: 480,
    letterSpacing: "-0.2px",
    textAlign: "left",
    cursor: "pointer",
    transitionProperty: "transform, background-color",
    transitionDuration: `${motion.durPress}, ${motion.durFast}`,
    transitionTimingFunction: motion.easeOut,
  },
  current: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
  },
  gap: {
    flexGrow: 1,
    minHeight: 16,
  },
  divider: {
    height: 1,
    flexShrink: 0,
    marginTop: 0,
    marginInline: space.lg,
    marginBottom: space.xs,
    backgroundColor: colors.borderHairline,
  },
});

export function SidebarDrawer({ open, active, onClose, onNavigate }: SidebarDrawerProps) {
  const row = (item: SidebarItem) => {
    const current = item.key === active;

    return (
      <button
        key={item.key}
        type="button"
        aria-label={item.name === item.label ? undefined : item.name}
        aria-current={current ? "page" : undefined}
        onClick={() => onNavigate(item.path)}
        {...stylex.props(styles.row, current && styles.current, press.scale)}
      >
        <Icon icon={item.icon} size={24} />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div {...stylex.props(styles.layer)}>
      <nav
        aria-label={copy.nav.main}
        inert={!open}
        {...stylex.props(styles.drawer, !open && styles.closed)}
      >
        <div {...stylex.props(styles.header)}>
          <span {...stylex.props(styles.title)}>{copy.appName}</span>
          <IconButton icon={X} label={copy.nav.closeSidebar} size="touch" onClick={onClose} />
        </div>
        {SIDEBAR_VIEWS.map(row)}
        <span aria-hidden="true" {...stylex.props(styles.gap)} />
        <span aria-hidden="true" {...stylex.props(styles.divider)} />
        {SIDEBAR_PINNED.map(row)}
      </nav>
    </div>
  );
}
