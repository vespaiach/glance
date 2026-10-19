import * as stylex from "@stylexjs/stylex";
import { type } from "@/theme/type.stylex";

export type TodayGrid = "stacked" | "portrait" | "twoColumn" | "threeColumn";

export type TodayLayout = { grid: TodayGrid; noteColumns: 1 | 2; noteLimit: 1 | 2 };

export const todayGrids = stylex.create({
  stacked: {
    gridTemplateColumns: "minmax(0, 1fr)",
    gridTemplateAreas: '"hero" "sched" "notes" "potd"',
    gridTemplateRows: "auto",
  },
  portrait: {
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gridTemplateAreas: '"hero notes" "hero potd" "sched sched"',
    gridTemplateRows: "auto auto minmax(0, 1fr)",
    height: "100%",
  },
  twoColumn: {
    gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.3fr)",
    gridTemplateAreas: '"hero sched" "notes potd"',
    gridTemplateRows: "max(660px, 100vh - 160px) auto",
  },
  threeColumn: {
    gridTemplateColumns: "minmax(0, 0.95fr) minmax(0, 1.5fr) minmax(0, 1fr)",
    gridTemplateAreas: '"hero sched notes" "hero sched potd"',
    gridTemplateRows: "minmax(0, 1fr) minmax(0, 1fr)",
    height: "100%",
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
  fill: { minHeight: 0 },
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

type RowsInput = { available: number; rowHeight: number };

const MIN_ROWS = 2;

const MAX_ROWS = 10;

const COLUMNS_MIN_WIDTH = 1024;

const TWO_COLUMN_MAX_WIDTH = 1180;

const WIDE_NOTES_MIN_WIDTH = 1600;

const TWO_NOTES_MIN_HEIGHT = 880;

const TWO_NOTE_COLUMNS_MIN_WIDTH = 600;

export function todayLayout(width: number, height: number): TodayLayout {
  if (width < COLUMNS_MIN_WIDTH) {
    return {
      grid: "stacked",
      noteColumns: width < TWO_NOTE_COLUMNS_MIN_WIDTH ? 1 : 2,
      noteLimit: 2,
    };
  }

  if (height > width) return { grid: "portrait", noteColumns: 1, noteLimit: 2 };

  if (width <= TWO_COLUMN_MAX_WIDTH) return { grid: "twoColumn", noteColumns: 2, noteLimit: 2 };

  return {
    grid: "threeColumn",
    noteColumns: width < WIDE_NOTES_MIN_WIDTH ? 1 : 2,
    noteLimit: height < TWO_NOTES_MIN_HEIGHT ? 1 : 2,
  };
}

export function scheduleRows({ available, rowHeight }: RowsInput): number {
  return Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.floor(available / rowHeight)));
}
