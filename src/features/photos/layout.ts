import * as stylex from "@stylexjs/stylex";
import { type Breakpoint, layoutSize } from "@/domain/breakpoint";

const grids = stylex.create({
  large: { gridTemplateColumns: "minmax(0, 1.6fr) minmax(300px, 1fr)", minHeight: "100%" },
  small: { gridTemplateColumns: "minmax(0, 1fr)" },
});

const featured = stylex.create({
  large: { minHeight: 320 },
  small: { minHeight: 260 },
});

const panels = stylex.create({
  large: { height: 0, minHeight: "100%" },
  small: {},
});

const thumbs = stylex.create({
  two: { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
});

export function photosLayout(breakpoint: Breakpoint) {
  const size = layoutSize(breakpoint);

  return { grid: grids[size], featured: featured[size], panel: panels[size], thumbs: thumbs.two };
}
