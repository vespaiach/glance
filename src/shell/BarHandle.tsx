import * as stylex from "@stylexjs/stylex";
import { ChevronUp } from "lucide-react";
import { copy } from "@/copy";
import { colors, radii, shadows } from "@/theme/tokens.stylex";
import { Icon } from "@/ui/Icon";
import { press } from "@/ui/press";

const styles = stylex.create({
  handle: {
    position: "fixed",
    insetInline: 0,
    bottom: 12,
    marginInline: "auto",
    zIndex: 5,
    width: 72,
    height: 44,
    borderWidth: 0,
    padding: 0,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
    boxShadow: `${shadows.shadow1}, ${shadows.shadow2}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
});

export function BarHandle({ onReveal }: { onReveal: () => void }) {
  return (
    <button
      type="button"
      aria-label={copy.nav.showMenu}
      onClick={onReveal}
      {...stylex.props(styles.handle, press.scale)}
    >
      <Icon icon={ChevronUp} size={22} />
    </button>
  );
}
