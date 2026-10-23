export type Breakpoint = "large" | "normal" | "small";

export type LayoutSize = "large" | "small";

export const BREAKPOINT_MIN_WIDTHS = { large: 1201, normal: 769 } as const;

export function breakpointFor(width: number): Breakpoint {
  if (width >= BREAKPOINT_MIN_WIDTHS.large) return "large";

  return width >= BREAKPOINT_MIN_WIDTHS.normal ? "normal" : "small";
}

export function layoutSize(breakpoint: Breakpoint): LayoutSize {
  return breakpoint === "small" ? "small" : "large";
}
