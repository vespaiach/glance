export type FullScreen = { kind: "closed" } | { kind: "open"; chrome: boolean };

export type FullScreenAction = { type: "open" } | { type: "exit" } | { type: "toggleChrome" };

const CLOSED: FullScreen = { kind: "closed" };

export function fullScreen(state: FullScreen, action: FullScreenAction): FullScreen {
  if (action.type === "open") return { kind: "open", chrome: true };

  if (action.type === "exit") return CLOSED;

  return state.kind === "open" ? { kind: "open", chrome: !state.chrome } : state;
}
