import type { Breakpoint } from "@/domain/breakpoint";

const LABELED_BAR = 88;

const ICON_BAR = 72;

const PILL_GAP = 12;

const LABELED_PILL_BOTTOM = 24;

export function navLabelsShown(breakpoint: Breakpoint): boolean {
  return breakpoint === "wide" || breakpoint === "mid";
}

export function barHeight(breakpoint: Breakpoint): number {
  return navLabelsShown(breakpoint) ? LABELED_BAR : ICON_BAR;
}

export function offlinePillBottom(breakpoint: Breakpoint): number {
  if (breakpoint === "phone") return barHeight(breakpoint) + PILL_GAP;

  return navLabelsShown(breakpoint) ? LABELED_PILL_BOTTOM : PILL_GAP;
}
