import * as stylex from "@stylexjs/stylex";
import { type Breakpoint, layoutSize } from "@/domain/breakpoint";

type Span = { top: number; bottom: number };

export const THUMB_REVEAL_PX = 12;

const grids = stylex.create({
  large: {
    gridTemplateColumns: "minmax(0, 1.6fr) minmax(300px, 1fr)",
    gridTemplateRows: "minmax(0, 1fr)",
    height: "100%",
    minHeight: "100%",
  },
  small: { gridTemplateColumns: "minmax(0, 1fr)" },
});

const featured = stylex.create({
  large: { minHeight: 200 },
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

export function revealDelta(view: Span, item: Span, pad: number): number {
  if (item.top < view.top + pad) return item.top - view.top - pad;

  if (item.bottom > view.bottom - pad) return item.bottom - view.bottom + pad;

  return 0;
}
