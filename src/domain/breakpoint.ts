export type Breakpoint = "wide" | "mid" | "narrow" | "phone";

export const BREAKPOINT_MIN_WIDTHS = { wide: 1200, mid: 1000, narrow: 600 } as const;

export function breakpointFor(width: number): Breakpoint {
  if (width >= BREAKPOINT_MIN_WIDTHS.wide) return "wide";

  if (width >= BREAKPOINT_MIN_WIDTHS.mid) return "mid";

  return width >= BREAKPOINT_MIN_WIDTHS.narrow ? "narrow" : "phone";
}
