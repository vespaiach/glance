import * as stylex from "@stylexjs/stylex";
import type { Breakpoint } from "@/domain/breakpoint";

const grids = stylex.create({
  wide: { gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", minHeight: "100%" },
  mid: { gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", minHeight: "100%" },
  narrow: { gridTemplateColumns: "minmax(0, 1fr)" },
  phone: { gridTemplateColumns: "minmax(0, 1fr)" },
});

export function signInLayout(breakpoint: Breakpoint): stylex.StyleXStyles {
  return grids[breakpoint];
}
