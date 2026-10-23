import * as stylex from "@stylexjs/stylex";
import { type Breakpoint, layoutSize } from "@/domain/breakpoint";

const PILL_WINDOW = 1400;

const PICKER_INSET = 80;

const PICKER_CELL = { min: 36, max: 56 } as const;

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minWidth: 0,
  },
  large: { gap: 24 },
  small: { gap: 24 },
  fit: { height: "100%", minHeight: 0 },
  scroll: { minHeight: "100%" },
});

export function calendarLayout(breakpoint: Breakpoint, span24: boolean): stylex.StyleXStyles {
  const size = layoutSize(breakpoint);

  const fits = size === "large" && !span24;

  return [styles.root, styles[size], fits ? styles.fit : styles.scroll];
}

export function addEventPill(windowWidth: number): boolean {
  return windowWidth >= PILL_WINDOW;
}

export function pickerCell(windowWidth: number): number {
  const fit = Math.floor((windowWidth - PICKER_INSET) / 7);

  return Math.min(PICKER_CELL.max, Math.max(PICKER_CELL.min, fit));
}
