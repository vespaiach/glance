import * as stylex from "@stylexjs/stylex";
import type { Breakpoint } from "@/domain/breakpoint";

const grids = stylex.create({
  wide: {
    gridTemplateColumns: "minmax(300px, 0.95fr) minmax(0, 1.35fr) minmax(320px, 1fr)",
    gridTemplateAreas: '"hero sched wx" "hero sched notes"',
    gridTemplateRows: "auto minmax(0, 1fr)",
    minHeight: "100%",
  },
  mid: {
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.3fr)",
    gridTemplateAreas: '"hero sched" "wx notes"',
    gridTemplateRows: "auto auto",
  },
  narrow: {
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gridTemplateAreas: '"hero wx" "sched sched" "notes notes"',
    gridTemplateRows: "auto",
  },
  phone: {
    gridTemplateColumns: "minmax(0, 1fr)",
    gridTemplateAreas: '"hero" "wx" "sched" "notes"',
    gridTemplateRows: "auto",
  },
});

export const todayAreas = stylex.create({
  hero: { gridArea: "hero" },
  sched: { gridArea: "sched" },
  wx: { gridArea: "wx" },
  notes: { gridArea: "notes" },
});

const scheduleFits = stylex.create({
  wide: { contain: "size" },
  mid: {},
  narrow: {},
  phone: {},
});

export function todayScheduleFit(breakpoint: Breakpoint): stylex.StyleXStyles {
  return scheduleFits[breakpoint];
}

export function todayLayout(breakpoint: Breakpoint): stylex.StyleXStyles {
  return grids[breakpoint];
}

type CapacityInput = {
  bp: Breakpoint;
  portrait: boolean;
  windowHeight: number;
  allDayCount: number;
};

const FIXED_ROWS = 6;

const ROW_HEIGHT = 76;

const RESERVED_HEIGHT = 360;

const ALL_DAY_TILE_HEIGHT = 64;

const MIN_ROWS = 4;

const MAX_ROWS = 8;

const fitsByHeight = (bp: Breakpoint, portrait: boolean) =>
  bp === "wide" || (bp === "mid" && !portrait);

export function todayCapacity({ bp, portrait, windowHeight, allDayCount }: CapacityInput): number {
  if (!fitsByHeight(bp, portrait)) return FIXED_ROWS;

  const free = windowHeight - RESERVED_HEIGHT - allDayCount * ALL_DAY_TILE_HEIGHT;

  return Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.floor(free / ROW_HEIGHT)));
}
