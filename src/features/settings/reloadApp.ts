export type ReloadApp = { kind: "idle" } | { kind: "asking" } | { kind: "reloading" };

export type ReloadAppAction = { type: "ask" } | { type: "cancel" } | { type: "reload" };

export const RELOAD_IDLE: ReloadApp = { kind: "idle" };

export function reloadApp(state: ReloadApp, action: ReloadAppAction): ReloadApp {
  switch (action.type) {
    case "ask":
      return state.kind === "idle" ? { kind: "asking" } : state;
    case "cancel":
      return state.kind === "asking" ? RELOAD_IDLE : state;
    case "reload":
      return state.kind === "asking" ? { kind: "reloading" } : state;
  }
}
