import { linkToken } from "@/domain/qrSignIn";

export type ScanState =
  | { step: "closed" }
  | { step: "ask" }
  | { step: "asking"; sheet?: "ask" | "blocked" }
  | { step: "blocked" }
  | { step: "nocam" }
  | { step: "scanning" }
  | { step: "wrong" }
  | { step: "found"; token: string }
  | { step: "expired" };

export type CameraAccess = "granted" | "prompt" | "denied" | "none";

export type ScanAction =
  | { type: "open"; camera: CameraAccess }
  | { type: "continue" }
  | { type: "started" }
  | { type: "denied" }
  | { type: "no-camera" }
  | { type: "read"; text: string; origin: string }
  | { type: "keep-scanning" }
  | { type: "stale" }
  | { type: "failed" }
  | { type: "close" }
  | { type: "dismiss" };

export type ScanControls = {
  state: ScanState;
  stream?: MediaStream;
  open(): void;
  act(action: ScanAction): void;
};

type Box = { left: number; top: number; width: number; height: number };

type Size = { width: number; height: number };

export const CLOSED_SCAN: ScanState = { step: "closed" };

const OPENED: Record<CameraAccess, ScanState> = {
  granted: { step: "asking" },
  prompt: { step: "ask" },
  denied: { step: "blocked" },
  none: { step: "nocam" },
};

export function scanReducer(state: ScanState, action: ScanAction): ScanState {
  switch (action.type) {
    case "open":
      return isShut(state) ? OPENED[action.camera] : state;
    case "continue":
      return askAgain(state);
    case "started":
      return state.step === "asking" ? { step: "scanning" } : state;
    case "denied":
      return state.step === "asking" ? { step: "blocked" } : state;
    case "no-camera":
      return state.step === "asking" ? { step: "nocam" } : state;
    case "read":
      return read(state, linkToken(action.text, action.origin));
    case "keep-scanning":
      return state.step === "wrong" ? { step: "scanning" } : state;
    case "stale":
      return state.step === "found" ? { step: "expired" } : state;
    case "failed":
      return state.step === "found" ? CLOSED_SCAN : state;
    case "close":
      return isShut(state) ? state : CLOSED_SCAN;
    case "dismiss":
      return state.step === "expired" ? CLOSED_SCAN : state;
  }
}

export function isCameraLive(state: ScanState): boolean {
  return state.step === "asking" || state.step === "scanning" || state.step === "wrong";
}

export function frameCrop(view: Box, video: Size, frame: Box) {
  const scale = Math.max(view.width / video.width, view.height / video.height);

  const left = view.left + (view.width - video.width * scale) / 2;

  const top = view.top + (view.height - video.height * scale) / 2;

  return {
    x: (frame.left - left) / scale,
    y: (frame.top - top) / scale,
    size: frame.width / scale,
  };
}

function isShut(state: ScanState): boolean {
  return state.step === "closed" || state.step === "expired";
}

function askAgain(state: ScanState): ScanState {
  if (state.step === "ask" || state.step === "blocked")
    return { step: "asking", sheet: state.step };

  return state;
}

function read(state: ScanState, token: string | undefined): ScanState {
  if (state.step !== "scanning" && state.step !== "wrong") return state;

  if (token) return { step: "found", token };

  return state.step === "wrong" ? state : { step: "wrong" };
}
