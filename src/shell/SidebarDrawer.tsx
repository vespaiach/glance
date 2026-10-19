import * as stylex from "@stylexjs/stylex";
import { X } from "lucide-react";
import { useRef } from "react";
import { copy } from "@/copy";
import { colors, motion, radii, shadows, space } from "@/theme/tokens.stylex";
import { Icon } from "@/ui/Icon";
import { press } from "@/ui/press";
import { useFocusWhenShown } from "./focusWhenShown";
import type { View } from "./routes";
import { SIDEBAR_PINNED, SIDEBAR_VIEWS, type SidebarItem } from "./sidebarItems";

type SidebarDrawerProps = {
  open: boolean;
  phone?: boolean;
  active?: View;
  onClose: () => void;
  onScrimTap?: () => void;
  onNavigate: (path: string) => void;
};

const styles = stylex.create({
  layer: {
    position: "fixed",
    inset: 0,
    zIndex: 4,
    pointerEvents: "none",
  },
  scrim: {
    position: "absolute",
    inset: 0,
    borderWidth: 0,
    padding: 0,
    backgroundColor: colors.scrim,
    pointerEvents: "auto",
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
    overflow: "hidden",
    transitionProperty: "transform",
    transitionDuration: motion.durBase,
    transitionTimingFunction: motion.easeSlide,
  },
  phoneDrawer: {
    width: 248,
    paddingTop: space.md,
    paddingInline: space.sm,
    paddingBottom: space.sm,
  },
  closed: {
    transform: "translateX(calc(-100% - 24px))",
    pointerEvents: "none",
  },
  list: {
    flexGrow: 1,
    minHeight: 0,
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
    gap: space.xxs,
  },
  title: {
    flexShrink: 0,
    paddingTop: 0,
    paddingRight: space.xxs,
    paddingBottom: space.sm,
    paddingLeft: space.lg,
    fontSize: 24,
    fontWeight: 540,
    letterSpacing: "-0.3px",
    lineHeight: "56px",
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
  phoneRow: {
    height: 48,
    gap: space.sm,
    paddingInline: space.md,
    fontSize: 16,
  },
  phoneTitle: {
    paddingBottom: space.xs,
    paddingLeft: space.md,
    fontSize: 20,
    lineHeight: "48px",
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
  phoneDivider: {
    marginInline: space.md,
  },
});

export function SidebarDrawer({
  open,
  phone = false,
  active,
  onClose,
  onScrimTap,
  onNavigate,
}: SidebarDrawerProps) {
  const currentRow = useRef<HTMLButtonElement>(null);

  const iconSize = phone ? 20 : 24;

  useFocusWhenShown(open, currentRow);

  const row = (item: SidebarItem) => {
    const current = item.key === active;

    return (
      <button
        key={item.key}
        ref={current ? currentRow : undefined}
        type="button"
        aria-label={item.name === item.label ? undefined : item.name}
        aria-current={current ? "page" : undefined}
        onClick={() => onNavigate(item.path)}
        {...stylex.props(
          styles.row,
          phone && styles.phoneRow,
          current && styles.current,
          press.scale,
        )}
      >
        <Icon icon={item.icon} size={iconSize} />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div {...stylex.props(styles.layer)}>
      {phone && open && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={onScrimTap}
          {...stylex.props(styles.scrim)}
        />
      )}
      <nav
        aria-label={copy.nav.main}
        inert={!open}
        {...stylex.props(styles.drawer, phone && styles.phoneDrawer, !open && styles.closed)}
      >
        <div {...stylex.props(styles.list)}>
          <span {...stylex.props(styles.title, phone && styles.phoneTitle)}>{copy.appName}</span>
          {SIDEBAR_VIEWS.map(row)}
          <span aria-hidden="true" {...stylex.props(styles.gap)} />
          <span
            aria-hidden="true"
            {...stylex.props(styles.divider, phone && styles.phoneDivider)}
          />
          {SIDEBAR_PINNED.map(row)}
        </div>
        <button
          type="button"
          aria-label={copy.nav.closeSidebar}
          onClick={onClose}
          {...stylex.props(styles.row, phone && styles.phoneRow, press.scale)}
        >
          <Icon icon={X} size={iconSize} />
          <span>{copy.nav.close}</span>
        </button>
      </nav>
    </div>
  );
}
