import * as stylex from "@stylexjs/stylex";
import type { Breakpoint } from "@/domain/breakpoint";

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minWidth: 0,
  },
  wide: { gap: 24 },
  phone: { gap: 12 },
  fit: { height: "100%", minHeight: 0 },
  scroll: { minHeight: "100%" },
});

export function calendarLayout(breakpoint: Breakpoint, span24: boolean): stylex.StyleXStyles {
  const fits = breakpoint !== "phone" && !span24;

  return [
    styles.root,
    breakpoint === "wide" && styles.wide,
    breakpoint === "phone" && styles.phone,
    fits ? styles.fit : styles.scroll,
  ];
}
