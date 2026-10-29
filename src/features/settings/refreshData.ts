export type RefreshData = { kind: "idle" } | { kind: "busy" } | { kind: "done" } | { kind: "fail" };

export type RefreshDataAction = { type: "refresh" } | { type: "refreshed" } | { type: "failed" };

export const REFRESH_IDLE: RefreshData = { kind: "idle" };

export function refreshData(state: RefreshData, action: RefreshDataAction): RefreshData {
  switch (action.type) {
    case "refresh":
      return state.kind === "busy" ? state : { kind: "busy" };
    case "refreshed":
      return state.kind === "busy" ? { kind: "done" } : state;
    case "failed":
      return state.kind === "busy" ? { kind: "fail" } : state;
  }
}
