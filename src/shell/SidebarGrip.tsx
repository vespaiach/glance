import * as stylex from "@stylexjs/stylex";
import type { Ref } from "react";
import { copy } from "@/copy";
import { colors, radii } from "@/theme/tokens.stylex";

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
    justifyContent: "center",
    cursor: "pointer",
  },
  smallGrip: {
    width: 40,
  },
  off: {
    display: "none",
  },
  pill: {
    display: "block",
    width: 5,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.textPrimary,
  },
  smallPill: {
    width: 4,
    height: 56,
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
      {...stylex.props(styles.grip, small && styles.smallGrip, !shown && styles.off)}
    >
      <span {...stylex.props(styles.pill, small && styles.smallPill)} />
    </button>
  );
}
