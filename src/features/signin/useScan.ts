import { useEffect, useEffectEvent, useReducer, useState } from "react";
import type { SignedIn, SignInAuth } from "@/data/repos";
import {
  type CameraAccess,
  CLOSED_SCAN,
  isCameraLive,
  type ScanAction,
  type ScanControls,
  scanReducer,
} from "./scan";

type Options = {
  verifyLink: SignInAuth["verifyLink"];
  online: boolean;
  onSignedIn: (status: SignedIn) => void;
};

const WRONG_TILE_MS = 3_000;

const NO_CAMERA = ["NotFoundError", "OverconstrainedError"];

export function useScan({ verifyLink, online, onSignedIn }: Options): ScanControls {
  const [state, dispatch] = useReducer(scanReducer, CLOSED_SCAN);

  const [stream, setStream] = useState<MediaStream>();

  const signedIn = useEffectEvent(onSignedIn);

  const live = isCameraLive(state);

  useEffect(() => {
    if (state.step !== "asking") return;

    let current = true;

    void startCamera().then((started) => {
      if (typeof started === "string") return current && dispatch(cameraFailed(started));

      if (!current) return stopCamera(started);

      setStream(started);

      dispatch({ type: "started" });
    });

    return () => {
      current = false;
    };
  }, [state.step]);

  useEffect(() => {
    if (!live) setStream(undefined);
  }, [live]);

  useEffect(() => () => stopCamera(stream), [stream]);

  useEffect(() => {
    if (state.step !== "wrong") return;

    const timer = setTimeout(() => dispatch({ type: "keep-scanning" }), WRONG_TILE_MS);

    return () => clearTimeout(timer);
  }, [state.step]);

  const token = state.step === "found" ? state.token : undefined;

  useEffect(() => {
    if (!token) return;

    void verifyLink(token).then((answer) => {
      if (answer.ok) signedIn(answer.value);

      dispatch(
        answer.ok ? { type: "close" } : { type: answer.error === "invalid" ? "stale" : "failed" },
      );
    });
  }, [token, verifyLink]);

  useEffect(() => {
    if (!online) dispatch({ type: "close" });
  }, [online]);

  useEffect(() => {
    const hidden = () => {
      if (document.visibilityState === "hidden") dispatch({ type: "close" });
    };

    document.addEventListener("visibilitychange", hidden);

    return () => document.removeEventListener("visibilitychange", hidden);
  }, []);

  const open = () => {
    void cameraAccess().then((camera) => dispatch({ type: "open", camera }));
  };

  return { state, ...(stream && { stream }), open, act: dispatch };
}

async function cameraAccess(): Promise<CameraAccess> {
  if (!navigator.mediaDevices?.getUserMedia) return "none";

  const permission = await navigator.permissions
    ?.query({ name: "camera" as PermissionName })
    .catch(() => undefined);

  return permission?.state ?? "prompt";
}

function startCamera(): Promise<MediaStream | string> {
  return navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" }, audio: false })
    .catch((error: DOMException) => error.name);
}

function cameraFailed(name: string): ScanAction {
  return { type: NO_CAMERA.includes(name) ? "no-camera" : "denied" };
}

function stopCamera(stream: MediaStream | undefined): void {
  for (const track of stream?.getTracks() ?? []) track.stop();
}
