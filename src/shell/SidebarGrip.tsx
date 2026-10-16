import * as stylex from "@stylexjs/stylex";
import { useRef } from "react";
import { copy } from "@/copy";
import { colors, radii } from "@/theme/tokens.stylex";
import { useFocusWhenShown } from "./focusWhenShown";

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
});

export function SidebarGrip({ shown, onShow }: { shown: boolean; onShow: () => void }) {
  const grip = useRef<HTMLButtonElement>(null);

  useFocusWhenShown(shown, grip);

  return (
    <button
      ref={grip}
      type="button"
      hidden={!shown}
      aria-label={copy.nav.showSidebar}
      aria-expanded={false}
      onClick={onShow}
      {...stylex.props(styles.grip, !shown && styles.off)}
    >
      <span {...stylex.props(styles.pill)} />
    </button>
  );
}
