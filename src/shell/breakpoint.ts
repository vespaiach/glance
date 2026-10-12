"use client";

import { useSyncExternalStore } from "react";
import { BREAKPOINT_MIN_WIDTHS, type Breakpoint, breakpointFor } from "@/domain/breakpoint";

const MIN_WIDTHS = Object.values(BREAKPOINT_MIN_WIDTHS);

function mediaFor(width: number): MediaQueryList {
  return window.matchMedia(`(min-width: ${width}px)`);
}

function subscribe(listener: () => void) {
  const lists = MIN_WIDTHS.map(mediaFor);

  for (const list of lists) list.addEventListener("change", listener);

  return () => {
    for (const list of lists) list.removeEventListener("change", listener);
  };
}

function widestMatch(): number {
  return MIN_WIDTHS.find((width) => mediaFor(width).matches) ?? 0;
}

export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(
    subscribe,
    () => breakpointFor(widestMatch()),
    () => "wide",
  );
}

function subscribeResize(listener: () => void) {
  window.addEventListener("resize", listener);

  return () => window.removeEventListener("resize", listener);
}

export function useViewportWidth(): number {
  return useSyncExternalStore(
    subscribeResize,
    () => window.innerWidth,
    () => 0,
  );
}
