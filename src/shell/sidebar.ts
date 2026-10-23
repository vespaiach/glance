import type { FixtureParams } from "@/data/repos";
import type { View } from "./routes";

export type SidebarMode = "hidden" | "rail" | "expanded";

export type SidebarState = { mode: "hidden" } | { mode: "rail" } | { mode: "expanded" };

export type SidebarAction =
  | { type: "show"; small?: boolean }
  | { type: "open" }
  | { type: "close" }
  | { type: "hide" }
  | { type: "back"; small?: boolean }
  | { type: "idle" }
  | { type: "viewChanged"; view: View | undefined; small?: boolean };

export const SIDEBAR_IDLE_SECONDS = 15;

const INSET: Record<Exclude<SidebarMode, "hidden">, number> = { rail: 80, expanded: 332 };

const GRIP_PAD = { large: 36, small: 24 } as const;

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
  small = false,
): SidebarState {
  switch (fixture) {
    case "1":
      return { mode: small ? "hidden" : "rail" };
    case "open":
      return { mode: "expanded" };
    default:
      return { mode: view === "today" || small ? "hidden" : "rail" };
  }
}

export function sidebarInset(mode: SidebarMode, view: View | undefined, small: boolean): number {
  if (small || mode === "hidden") return gripPad(view, small);

  return INSET[mode];
}

function nextMode(mode: SidebarMode, action: SidebarAction): SidebarMode | undefined {
  if (action.type === "viewChanged") return afterViewChange(mode, action.view, action.small);

  if (action.type === "show" && action.small) return mode === "expanded" ? undefined : "expanded";

  if (action.type === "back" && action.small) return mode === "expanded" ? "hidden" : undefined;

  return TRANSITIONS[action.type][mode];
}

function afterViewChange(mode: SidebarMode, view: View | undefined, small = false): SidebarMode {
  if (small) return "hidden";

  if (mode === "hidden" && view === "today") return mode;

  return "rail";
}

function gripPad(view: View | undefined, small: boolean): number {
  if (view === "today") return 0;

  return small ? GRIP_PAD.small : GRIP_PAD.large;
}
