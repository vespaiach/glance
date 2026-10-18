import { type RefObject, useLayoutEffect, useRef } from "react";
import { pageMotion } from "./pageMotion";

let shownPath: string | undefined;

let running: Animation | undefined;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function usePageTransition<T extends HTMLElement>(pathname: string): RefObject<T | null> {
  const target = useRef<T>(null);

  useLayoutEffect(() => {
    const from = shownPath;

    shownPath = pathname;

    const el = target.current;

    if (el === null) return;

    el.scrollTop = 0;

    running?.cancel();

    running = undefined;

    const motion = pageMotion(from, pathname);

    if (motion === undefined || prefersReducedMotion() || typeof el.animate !== "function") return;

    running = el.animate(motion.keyframes, motion.options);
  }, [pathname]);

  return target;
}
