import type { FixtureParams } from "@/data/repos";
import type { View } from "./routes";

export type SidebarMode = "hidden" | "rail" | "expanded";

export type SidebarState = { mode: "hidden" } | { mode: "rail" } | { mode: "expanded" };

export type SidebarAction =
  | { type: "show"; phone?: boolean }
  | { type: "open" }
  | { type: "close" }
  | { type: "hide" }
  | { type: "back"; phone?: boolean }
  | { type: "idle" }
  | { type: "viewChanged"; view: View | undefined; phone?: boolean };

export const SIDEBAR_IDLE_SECONDS = 20;

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
  const next = nextMode(state.mode, action);

  return next && next !== state.mode ? { mode: next } : state;
}

export function initialSidebar(
  fixture: FixtureParams["rail"],
  view: View | undefined,
  phone = false,
): SidebarState {
  switch (fixture) {
    case "1":
      return { mode: phone ? "hidden" : "rail" };
    case "open":
      return { mode: "expanded" };
    default:
      return { mode: view === "today" || phone ? "hidden" : "rail" };
  }
}

export function sidebarInset(mode: SidebarMode, phone: boolean): number {
  return phone ? 0 : INSET[mode];
}

function nextMode(mode: SidebarMode, action: SidebarAction): SidebarMode | undefined {
  if (action.type === "viewChanged") return afterViewChange(mode, action.view, action.phone);

  if (action.type === "show" && action.phone) return mode === "expanded" ? undefined : "expanded";

  if (action.type === "back" && action.phone) return mode === "expanded" ? "hidden" : undefined;

  return TRANSITIONS[action.type][mode];
}

function afterViewChange(mode: SidebarMode, view: View | undefined, phone = false): SidebarMode {
  if (phone) return "hidden";

  if (mode === "hidden" && view === "today") return mode;

  return "rail";
}
