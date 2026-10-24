import * as stylex from "@stylexjs/stylex";
import { colors, radii } from "@/theme/tokens.stylex";

const styles = stylex.create({
  toast: {
    position: "fixed",
    left: "50%",
    bottom: 24,
    transform: "translateX(-50%)",
    zIndex: 31,
    maxWidth: "calc(100% - 32px)",
    boxSizing: "border-box",
    backgroundColor: colors.surfaceInverse,
    color: colors.textInverse,
    borderRadius: radii.pill,
    paddingBlock: 12,
    paddingInline: 20,
    fontSize: 15,
    fontWeight: 340,
    textWrap: "pretty",
  },
});

export function Toast({ children }: { children: string }) {
  return (
    <div role="status" {...stylex.props(styles.toast)}>
      {children}
    </div>
  );
}
