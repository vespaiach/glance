import * as stylex from "@stylexjs/stylex";
import { type Breakpoint, layoutSize } from "@/domain/breakpoint";

const grids = stylex.create({
  large: { gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 1fr)" },
  small: { gridTemplateColumns: "minmax(0, 1fr)" },
});

export function settingsLayout(breakpoint: Breakpoint): stylex.StyleXStyles {
  return grids[layoutSize(breakpoint)];
}
