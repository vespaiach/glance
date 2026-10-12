import * as stylex from "@stylexjs/stylex";
import type { Breakpoint } from "@/domain/breakpoint";

const grids = stylex.create({
  wide: { gridTemplateColumns: "auto minmax(0, 1fr)" },
  mid: { gridTemplateColumns: "auto minmax(0, 1fr)" },
  narrow: { gridTemplateColumns: "minmax(0, 1fr)" },
  phone: { gridTemplateColumns: "minmax(0, 1fr)" },
});

export const CALENDAR_CELL = { wide: 60, mid: 54, narrow: 84 } as const;

export function calendarLayout(breakpoint: Breakpoint): stylex.StyleXStyles {
  return grids[breakpoint];
}
