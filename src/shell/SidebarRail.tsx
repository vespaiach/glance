import * as stylex from "@stylexjs/stylex";
import { PanelLeftOpen } from "lucide-react";
import { useRef } from "react";
import { copy } from "@/copy";
import { colors, motion, space } from "@/theme/tokens.stylex";
import { IconButton } from "@/ui/IconButton";
import { useFocusWhenShown } from "./focusWhenShown";
import type { View } from "./routes";
import type { SidebarMode } from "./sidebar";
import { SIDEBAR_PINNED, SIDEBAR_VIEWS, type SidebarItem } from "./sidebarItems";

type SidebarRailProps = {
  mode: SidebarMode;
  active?: View;
  onOpen: () => void;
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
    overflow: "auto",
    transitionProperty: "transform",
    transitionDuration: motion.durBase,
    transitionTimingFunction: motion.easeSlide,
  },
  hidden: {
    transform: "translateX(-100%)",
  },
  divider: {
    width: 40,
    height: 1,
    flexShrink: 0,
    marginBlock: space.xxs,
    backgroundColor: colors.borderHairline,
  },
  gap: {
    flexGrow: 1,
    minHeight: 16,
  },
});

export function SidebarRail({ mode, active, onOpen, onNavigate }: SidebarRailProps) {
  const openMenu = useRef<HTMLButtonElement>(null);

  useFocusWhenShown(mode === "rail", openMenu);

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
      inert={mode === "hidden"}
      {...stylex.props(styles.rail, mode === "hidden" && styles.hidden)}
    >
      <IconButton
        ref={openMenu}
        icon={PanelLeftOpen}
        label={copy.nav.openMenu}
        size="touch"
        expanded={mode === "expanded"}
        onClick={onOpen}
      />
      <span aria-hidden="true" {...stylex.props(styles.divider)} />
      {SIDEBAR_VIEWS.map(button)}
      <span aria-hidden="true" {...stylex.props(styles.gap)} />
      {SIDEBAR_PINNED.map(button)}
    </nav>
  );
}
