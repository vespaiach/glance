import * as stylex from "@stylexjs/stylex";
import type { Breakpoint } from "@/domain/breakpoint";
import { sizes } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";

export type TodayGrid = "stacked" | "twoColumn" | "threeColumn";

const GRIDS: Record<Breakpoint, TodayGrid> = {
  large: "threeColumn",
  normal: "twoColumn",
  small: "stacked",
};

export const todayGrids = stylex.create({
  stacked: {
    gridTemplateColumns: "minmax(280px, 1fr)",
    gridTemplateAreas: '"hero" "sched" "notes" "potd"',
    gridTemplateRows: "auto",
  },
  twoColumn: {
    gridTemplateColumns: "minmax(280px, 0.8fr) minmax(300px, 1.2fr)",
    gridTemplateAreas: '"hero sched" "notes potd"',
    gridTemplateRows: `minmax(max(500px, calc(100vh - ${sizes.kioskGutter} - 90px)), auto) auto`,
  },
  threeColumn: {
    gridTemplateColumns: "minmax(280px, 0.8fr) minmax(300px, 1.8fr) minmax(280px, 0.95fr)",
    gridTemplateAreas: '"hero sched notes" "hero sched potd"',
    gridTemplateRows: "minmax(0, 1fr) auto",
    height: `calc(100vh - 2 * ${sizes.kioskGutter})`,
  },
});

export const todayAreas = stylex.create({
  hero: { gridArea: "hero" },
  sched: { gridArea: "sched" },
  notes: { gridArea: "notes" },
  potd: { gridArea: "potd" },
  clipped: { minHeight: 0, overflow: "hidden" },
});

export const todayPotdHeights = stylex.create({
  capped: { height: "calc(25vh - 24px)", minHeight: 0, flexGrow: 0 },
  tall: { minHeight: 240 },
});

export const todayType = stylex.createTheme(type, {
  bodyLgSize: "clamp(18px, min(0.9375vw, 1.6667vh), 27px)",
  bodySize: "clamp(16px, min(0.8333vw, 1.4815vh), 24px)",
  bodySmSize: "clamp(15px, min(0.78125vw, 1.3889vh), 22.5px)",
  headlineSize: "clamp(20px, min(1.0417vw, 1.8519vh), 30px)",
  eyebrowSize: "clamp(14px, min(0.7292vw, 1.2963vh), 21px)",
  captionSize: "clamp(14px, min(0.7292vw, 1.2963vh), 21px)",
  buttonSize: "clamp(17px, min(0.8854vw, 1.5741vh), 25.5px)",
});

export function todayLayout(breakpoint: Breakpoint): TodayGrid {
  return GRIDS[breakpoint];
}
