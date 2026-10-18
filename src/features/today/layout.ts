import * as stylex from "@stylexjs/stylex";
import type { Breakpoint } from "@/domain/breakpoint";
import { type } from "@/theme/type.stylex";

export type TodayGrid = "stacked" | "landscape" | "portrait";

export type TodayLayout = { grid: TodayGrid; noteColumns: 1 | 2 };

export const todayGrids = stylex.create({
  stacked: {
    gridTemplateColumns: "minmax(0, 1fr)",
    gridTemplateAreas: '"hero" "wx" "sched" "notes"',
    gridTemplateRows: "auto",
  },
  landscape: {
    gridTemplateColumns: "minmax(0, 0.95fr) minmax(0, 1.35fr) minmax(0, 1fr)",
    gridTemplateAreas: '"hero sched wx" "hero sched notes"',
    gridTemplateRows: "auto minmax(0, 1fr)",
    height: "100%",
  },
  portrait: {
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gridTemplateAreas: '"hero wx" "sched sched" "notes notes"',
    gridTemplateRows: "auto minmax(0, 1fr) auto",
    height: "100%",
  },
});

export const todayAreas = stylex.create({
  hero: { gridArea: "hero" },
  sched: { gridArea: "sched" },
  wx: { gridArea: "wx" },
  notes: { gridArea: "notes" },
  clipped: { minHeight: 0, overflow: "hidden" },
  container: { containerType: "inline-size" },
});

const scaledBody = {
  bodyLgSize: "clamp(18px, min(0.9375vw, 1.6667vh), 27px)",
  bodySize: "clamp(16px, min(0.8333vw, 1.4815vh), 24px)",
  bodySmSize: "clamp(15px, min(0.78125vw, 1.3889vh), 22.5px)",
  headlineSize: "clamp(20px, min(1.0417vw, 1.8519vh), 30px)",
  eyebrowSize: "clamp(14px, min(0.7292vw, 1.2963vh), 21px)",
  captionSize: "clamp(14px, min(0.7292vw, 1.2963vh), 21px)",
  buttonSize: "clamp(17px, min(0.8854vw, 1.5741vh), 25.5px)",
};

export const todayStackedType = stylex.createTheme(type, scaledBody);

export const todayColumnsType = stylex.createTheme(type, {
  ...scaledBody,
  clockSize: "clamp(56px, 27cqi, 200px)",
  tempSize: "clamp(56px, 24cqi, 160px)",
});

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

const COLUMNS_MIN_WIDTH = 768;

const WIDE_NOTES_MIN_WIDTH = 1600;

const fitsByHeight = (bp: Breakpoint, portrait: boolean) =>
  bp === "wide" || (bp === "mid" && !portrait);

export function todayLayout(width: number, height: number): TodayLayout {
  if (width < COLUMNS_MIN_WIDTH) return { grid: "stacked", noteColumns: 2 };

  if (height > width) return { grid: "portrait", noteColumns: 2 };

  return { grid: "landscape", noteColumns: width >= WIDE_NOTES_MIN_WIDTH ? 2 : 1 };
}

export function todayCapacity({ bp, portrait, windowHeight, allDayCount }: CapacityInput): number {
  if (!fitsByHeight(bp, portrait)) return FIXED_ROWS;

  const free = windowHeight - RESERVED_HEIGHT - allDayCount * ALL_DAY_TILE_HEIGHT;

  return Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.floor(free / ROW_HEIGHT)));
}
