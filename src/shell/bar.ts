import type { FixtureParams } from "@/data/repos";
import type { Breakpoint } from "@/domain/breakpoint";

export type BarMode = "docked" | "hidden" | "floating";

export type BarState = { mode: "docked" } | { mode: "hidden" } | { mode: "floating" };

export type BarAction = { type: "touch" } | { type: "idle" } | { type: "viewChanged" };

const LABELED_BAR = 88;

const ICON_BAR = 72;

const PILL_GAP = 12;

const LABELED_PILL_BOTTOM = 24;

const HANDLE_TOP = 56;

const BAR_IDLE_MS = 20_000;

export function navLabelsShown(breakpoint: Breakpoint): boolean {
  return breakpoint === "wide" || breakpoint === "mid";
}

export function barHeight(breakpoint: Breakpoint): number {
  return navLabelsShown(breakpoint) ? LABELED_BAR : ICON_BAR;
}

export function barLayoutHeight(mode: BarMode, breakpoint: Breakpoint): number {
  return mode === "docked" ? barHeight(breakpoint) : 0;
}

export function offlinePillBottom(breakpoint: Breakpoint, mode: BarMode): number {
  if (breakpoint !== "phone") return navLabelsShown(breakpoint) ? LABELED_PILL_BOTTOM : PILL_GAP;

  return (mode === "hidden" ? HANDLE_TOP : barHeight(breakpoint)) + PILL_GAP;
}

export function barReducer(state: BarState, action: BarAction): BarState {
  switch (action.type) {
    case "touch":
      return state.mode === "hidden" ? { mode: "floating" } : state;
    case "idle":
      return state.mode === "hidden" ? state : { mode: "hidden" };
    case "viewChanged":
      return state.mode === "floating" ? { mode: "docked" } : state;
  }
}

export function initialBar(fixture: FixtureParams["bar"]): BarState {
  switch (fixture) {
    case "hidden":
      return { mode: "hidden" };
    case "float":
      return { mode: "floating" };
    default:
      return { mode: "docked" };
  }
}

export function barIdleDue(lastTouch: Date, now: Date): boolean {
  return now.getTime() - lastTouch.getTime() >= BAR_IDLE_MS;
}
