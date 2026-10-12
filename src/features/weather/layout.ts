import * as stylex from "@stylexjs/stylex";
import type { Breakpoint } from "@/domain/breakpoint";

const grids = stylex.create({
  wide: {
    gridTemplateColumns: "minmax(380px, 0.85fr) minmax(0, 1.4fr)",
    minHeight: "100%",
  },
  mid: {
    gridTemplateColumns: "minmax(340px, 0.8fr) minmax(0, 1.2fr)",
    minHeight: "100%",
  },
  narrow: { gridTemplateColumns: "minmax(0, 1fr)" },
  phone: { gridTemplateColumns: "minmax(0, 1fr)" },
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
  const fit = breakpoint === "phone" ? "scroll" : "fit";

  return { grid: grids[breakpoint], hourly: hourly[fit], daily: daily[fit] };
}
