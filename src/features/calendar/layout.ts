import * as stylex from "@stylexjs/stylex";
import { type Breakpoint, layoutSize } from "@/domain/breakpoint";

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minWidth: 0,
  },
  large: { gap: 24 },
  small: { gap: 12 },
  fit: { height: "100%", minHeight: 0 },
  scroll: { minHeight: "100%" },
});

export function calendarLayout(breakpoint: Breakpoint, span24: boolean): stylex.StyleXStyles {
  const size = layoutSize(breakpoint);

  const fits = size === "large" && !span24;

  return [styles.root, styles[size], fits ? styles.fit : styles.scroll];
}
