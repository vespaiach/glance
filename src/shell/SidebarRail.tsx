import * as stylex from "@stylexjs/stylex";
import { X } from "lucide-react";
import { copy } from "@/copy";
import { colors, motion, space } from "@/theme/tokens.stylex";
import { IconButton } from "@/ui/IconButton";
import type { View } from "./routes";
import type { SidebarMode } from "./sidebar";
import { SIDEBAR_PINNED, SIDEBAR_VIEWS, type SidebarItem } from "./sidebarItems";

type SidebarRailProps = {
  mode: SidebarMode;
  active?: View;
  onHide: () => void;
  onNavigate: (path: string) => void;
};

const styles = stylex.create({
  rail: {
    position: "fixed",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 3,
    width: 80,
    boxSizing: "border-box",
    paddingBlock: space.md,
    backgroundColor: colors.surfaceCanvas,
    boxShadow: `inset -1px 0 0 ${colors.borderHairline}`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space.xs,
    overflow: "hidden",
    transitionProperty: "transform, opacity",
    transitionDuration: `${motion.durBase}, ${motion.durFast}`,
    transitionTimingFunction: `${motion.easeSlide}, ${motion.easeOut}`,
  },
  hidden: {
    transform: "translateX(-100%)",
  },
  faded: {
    opacity: 0,
  },
  list: {
    flexGrow: 1,
    minHeight: 0,
    width: "100%",
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space.xs,
  },
  gap: {
    flexGrow: 1,
    minHeight: 16,
  },
  footer: {
    flexShrink: 0,
    paddingTop: space.xs,
  },
});

export function SidebarRail({ mode, active, onHide, onNavigate }: SidebarRailProps) {
  const button = (item: SidebarItem) => {
    const current = item.key === active;

    return (
      <IconButton
        key={item.key}
        icon={item.icon}
        label={item.name}
        size="touch"
        variant={current ? "solid" : "soft"}
        current={current ? "page" : undefined}
        onClick={() => onNavigate(item.path)}
      />
    );
  };

  return (
    <nav
      aria-label={copy.nav.main}
      inert={mode !== "rail"}
      {...stylex.props(
        styles.rail,
        mode === "hidden" && styles.hidden,
        mode === "expanded" && styles.faded,
      )}
    >
      <div {...stylex.props(styles.list)}>
        {SIDEBAR_VIEWS.map(button)}
        <span aria-hidden="true" {...stylex.props(styles.gap)} />
        {SIDEBAR_PINNED.map(button)}
      </div>
      <div {...stylex.props(styles.footer)}>
        <IconButton icon={X} label={copy.nav.hideSidebar} size="touch" onClick={onHide} />
      </div>
    </nav>
  );
}
