import type { FixtureParams } from "@/data/repos";

export type SidebarMode = "hidden" | "rail" | "expanded";

export type SidebarState = { mode: "hidden" } | { mode: "rail" } | { mode: "expanded" };

export type SidebarAction =
  | { type: "show" }
  | { type: "open" }
  | { type: "close" }
  | { type: "back" }
  | { type: "viewChanged" };

const INSET: Record<SidebarMode, number> = { hidden: 0, rail: 80, expanded: 332 };

const TRANSITIONS: Record<SidebarAction["type"], Partial<Record<SidebarMode, SidebarMode>>> = {
  show: { hidden: "rail" },
  open: { rail: "expanded" },
  close: { expanded: "hidden" },
  back: { expanded: "rail" },
  viewChanged: { expanded: "rail" },
};

export function sidebarReducer(state: SidebarState, action: SidebarAction): SidebarState {
  const next = TRANSITIONS[action.type][state.mode];

  return next ? { mode: next } : state;
}

export function initialSidebar(fixture: FixtureParams["rail"]): SidebarState {
  switch (fixture) {
    case "1":
      return { mode: "rail" };
    case "open":
      return { mode: "expanded" };
    default:
      return { mode: "hidden" };
  }
}

export function sidebarInset(mode: SidebarMode): number {
  return INSET[mode];
}
