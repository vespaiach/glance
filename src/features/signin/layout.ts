import * as stylex from "@stylexjs/stylex";
import { type Breakpoint, layoutSize } from "@/domain/breakpoint";

const grids = stylex.create({
  large: { gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", minHeight: "100%" },
  small: { gridTemplateColumns: "minmax(0, 1fr)" },
});

export function signInLayout(breakpoint: Breakpoint): stylex.StyleXStyles {
  return grids[layoutSize(breakpoint)];
}
