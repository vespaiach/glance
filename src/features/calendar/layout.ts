import * as stylex from "@stylexjs/stylex";
import type { Breakpoint } from "@/domain/breakpoint";

const grids = stylex.create({
  wide: { gridTemplateColumns: "auto minmax(0, 1fr)" },
  mid: { gridTemplateColumns: "auto minmax(0, 1fr)" },
  narrow: { gridTemplateColumns: "minmax(0, 1fr)" },
  phone: { gridTemplateColumns: "minmax(0, 1fr)" },
});

const FIXED_CELL = { wide: 60, mid: 54 } as const;

const NARROW_MAX_CELL = 84;

const PHONE_MIN_CELL = 36;

const DAY_GAPS = 6 * 6;

const PHONE_INSET = 2 * 20 + 2 * 16 + DAY_GAPS;

const DAY_REVEAL = 220;

const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value));

export function calendarCell(breakpoint: Breakpoint, width: number): number {
  if (breakpoint === "wide" || breakpoint === "mid") return FIXED_CELL[breakpoint];

  if (breakpoint === "narrow") return narrowCell(width);

  return Math.max(PHONE_MIN_CELL, Math.floor((width - PHONE_INSET) / 7));
}

export function calendarLayout(breakpoint: Breakpoint): stylex.StyleXStyles {
  return grids[breakpoint];
}

export function dayRevealScroll(listTop: number, viewHeight: number): number {
  return Math.max(0, listTop - (viewHeight - DAY_REVEAL));
}

function narrowCell(width: number): number {
  const gutter = clamp(20, width * 0.026, 40);
  const padding = clamp(16, width * 0.03, 32);

  const fit = Math.floor((width - 2 * gutter - 2 * padding - DAY_GAPS) / 7);

  return Math.min(NARROW_MAX_CELL, fit);
}
