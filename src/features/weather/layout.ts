import * as stylex from "@stylexjs/stylex";
import { type Breakpoint, layoutSize } from "@/domain/breakpoint";

const grids = stylex.create({
  large: {
    gridTemplateColumns: "minmax(380px, 0.85fr) minmax(0, 1.4fr)",
    minHeight: "100%",
  },
  small: { gridTemplateColumns: "minmax(0, 1fr)" },
});

const hourly = stylex.create({
  fit: { gridTemplateColumns: "repeat(8, minmax(0, 1fr))" },
  scroll: { gridTemplateColumns: "repeat(8, 64px)", overflowX: "auto" },
});

const daily = stylex.create({
  fit: { gridTemplateColumns: "repeat(7, minmax(0, 1fr))" },
  scroll: { gridTemplateColumns: "repeat(7, 64px)", overflowX: "auto" },
});

export function weatherLayout(breakpoint: Breakpoint) {
  const size = layoutSize(breakpoint);

  const fit = size === "small" ? "scroll" : "fit";

  return { grid: grids[size], hourly: hourly[fit], daily: daily[fit] };
}
