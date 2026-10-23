import * as stylex from "@stylexjs/stylex";
import { ChevronRight } from "lucide-react";
import type { Ref } from "react";
import { copy } from "@/copy";
import { colors, motion, radii, shadows } from "@/theme/tokens.stylex";
import { Icon } from "@/ui/Icon";
import { press } from "@/ui/press";

const styles = stylex.create({
  grip: {
    position: "fixed",
    top: "50%",
    left: 0,
    zIndex: 5,
    width: 44,
    height: 144,
    marginTop: -72,
    padding: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    cursor: "pointer",
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  },
  off: {
    display: "none",
  },
  tab: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 112,
    borderTopRightRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
    boxShadow: `${shadows.shadow1}, ${shadows.shadow2}`,
  },
  smallTab: {
    width: 24,
    height: 96,
  },
});

type SidebarGripProps = {
  shown: boolean;
  small?: boolean;
  onShow: () => void;
  ref?: Ref<HTMLButtonElement>;
};

export function SidebarGrip({ shown, small = false, onShow, ref }: SidebarGripProps) {
  return (
    <button
      ref={ref}
      type="button"
      hidden={!shown}
      aria-label={small ? copy.nav.openMenu : copy.nav.showSidebar}
      aria-expanded={false}
      onClick={onShow}
      {...stylex.props(styles.grip, press.scale, !shown && styles.off)}
    >
      <span {...stylex.props(styles.tab, small && styles.smallTab)}>
        <Icon icon={ChevronRight} size={22} strokeWidth={2} />
      </span>
    </button>
  );
}
