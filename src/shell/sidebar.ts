import type { FixtureParams } from "@/data/repos";
import type { View } from "./routes";

export type SidebarMode = "hidden" | "rail" | "expanded";

export type SidebarState = { mode: "hidden" } | { mode: "rail" } | { mode: "expanded" };

export type SidebarAction =
  | { type: "show" }
  | { type: "open" }
  | { type: "close" }
  | { type: "hide" }
  | { type: "back" }
  | { type: "idle" }
  | { type: "viewChanged"; view: View | undefined };

export const SIDEBAR_IDLE_SECONDS = 15;

const INSET: Record<SidebarMode, number> = { hidden: 0, rail: 80, expanded: 332 };

const TRANSITIONS: Record<
  Exclude<SidebarAction["type"], "viewChanged">,
  Partial<Record<SidebarMode, SidebarMode>>
> = {
  show: { hidden: "rail" },
  open: { rail: "expanded" },
  close: { expanded: "hidden" },
  hide: { rail: "hidden" },
  back: { expanded: "rail" },
  idle: { rail: "hidden", expanded: "hidden" },
};

export function sidebarReducer(state: SidebarState, action: SidebarAction): SidebarState {
  const next =
    action.type === "viewChanged"
      ? afterViewChange(state.mode, action.view)
      : TRANSITIONS[action.type][state.mode];

  return next && next !== state.mode ? { mode: next } : state;
}

export function initialSidebar(
  fixture: FixtureParams["rail"],
  view: View | undefined,
): SidebarState {
  switch (fixture) {
    case "1":
      return { mode: "rail" };
    case "open":
      return { mode: "expanded" };
    default:
      return { mode: view === "today" ? "hidden" : "rail" };
  }
}

export function sidebarInset(mode: SidebarMode): number {
  return INSET[mode];
}

function afterViewChange(mode: SidebarMode, view: View | undefined): SidebarMode {
  if (mode === "hidden" && view === "today") return mode;

  return "rail";
}
