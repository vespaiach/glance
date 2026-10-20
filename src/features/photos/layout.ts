import * as stylex from "@stylexjs/stylex";
import type { Breakpoint } from "@/domain/breakpoint";

const grids = stylex.create({
  wide: { gridTemplateColumns: "minmax(0, 1.6fr) minmax(300px, 1fr)", minHeight: "100%" },
  mid: { gridTemplateColumns: "minmax(0, 1.6fr) minmax(300px, 1fr)", minHeight: "100%" },
  narrow: { gridTemplateColumns: "minmax(0, 1fr)" },
  phone: { gridTemplateColumns: "minmax(0, 1fr)" },
});

const featured = stylex.create({
  wide: { minHeight: 320 },
  mid: { minHeight: 320 },
  narrow: { minHeight: 440 },
  phone: { minHeight: 260 },
});

const panels = stylex.create({
  wide: { height: 0, minHeight: "100%" },
  mid: { height: 0, minHeight: "100%" },
  narrow: {},
  phone: {},
});

const thumbs = stylex.create({
  two: { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
  three: { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" },
});

export function photosLayout(breakpoint: Breakpoint) {
  return {
    grid: grids[breakpoint],
    featured: featured[breakpoint],
    panel: panels[breakpoint],
    thumbs: thumbs[breakpoint === "narrow" ? "three" : "two"],
  };
}
