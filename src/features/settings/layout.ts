import * as stylex from "@stylexjs/stylex";
import type { Breakpoint } from "@/domain/breakpoint";

const grids = stylex.create({
  wide: { gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 1fr)" },
  mid: { gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 1fr)" },
  narrow: { gridTemplateColumns: "minmax(0, 1fr)" },
  phone: { gridTemplateColumns: "minmax(0, 1fr)" },
});

export function settingsLayout(breakpoint: Breakpoint): stylex.StyleXStyles {
  return grids[breakpoint];
}
