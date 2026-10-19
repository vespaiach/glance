import * as stylex from "@stylexjs/stylex";
import type { Ref } from "react";
import { copy } from "@/copy";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { press } from "@/ui/press";

type SidebarHandleProps = {
  shown: boolean;
  expanded: boolean;
  phone?: boolean;
  onOpen: () => void;
  ref?: Ref<HTMLButtonElement>;
};

const styles = stylex.create({
  handle: {
    position: "fixed",
    top: "50%",
    left: 52,
    zIndex: 4,
    width: 56,
    height: 96,
    marginTop: -48,
    padding: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transitionProperty: "opacity, transform",
    transitionDuration: `${motion.durFast}, ${motion.durPress}`,
    transitionTimingFunction: motion.easeOut,
  },
  phoneHandle: {
    left: 44,
    width: 40,
  },
  faded: {
    opacity: 0,
    pointerEvents: "none",
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
  phonePill: {
    width: 4,
    height: 56,
  },
});

export function SidebarHandle({ shown, expanded, phone = false, onOpen, ref }: SidebarHandleProps) {
  return (
    <button
      ref={ref}
      type="button"
      hidden={!shown}
      inert={expanded}
      aria-label={copy.nav.expandMenu}
      aria-expanded={expanded}
      onClick={onOpen}
      {...stylex.props(
        styles.handle,
        phone && styles.phoneHandle,
        press.scale,
        expanded && styles.faded,
        !shown && styles.off,
      )}
    >
      <span {...stylex.props(styles.pill, phone && styles.phonePill)} />
    </button>
  );
}
