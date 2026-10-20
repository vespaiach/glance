import { usePathname, useRouter } from "next/navigation";
import { type RefObject, useCallback, useLayoutEffect } from "react";
import { enterHalf, type Half, isAmbientHop, leaveHalf } from "./ambientTransition";

const DROPPED_EVENTS = ["pointerdown", "click"] as const;

const CLAIM_MS = 1000;

const ROWS = ":scope > :not([data-backdrop])";

let root: HTMLElement | null = null;

let pending: string | undefined;

let transitioning = false;

let claimTimer: ReturnType<typeof setTimeout> | undefined;

export function useAmbientNavigate(): (path: string) => void {
  const router = useRouter();

  const pathname = usePathname();

  return useCallback(
    (path: string) => {
      if (transitioning) return;

      const from = root;

      if (!isAmbientHop(pathname, path) || from === null || !canAnimate(from))
        return router.push(path);

      start();

      void play(from, leaveHalf(pathname)).then(() => {
        awaitClaim(path);
        router.push(path);
      });
    },
    [router, pathname],
  );
}

export function useAmbientRoot<T extends HTMLElement>(ref: RefObject<T | null>, pathname: string) {
  useLayoutEffect(() => {
    const el = ref.current;

    if (el === null) return;

    root = el;

    if (pending === pathname) claim(el, pathname);

    return () => {
      if (root === el) root = null;
    };
  }, [ref, pathname]);
}

function canAnimate(el: HTMLElement): boolean {
  return (
    typeof el.animate === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function start() {
  transitioning = true;

  for (const type of DROPPED_EVENTS) window.addEventListener(type, drop, true);
}

function finish() {
  clearTimeout(claimTimer);

  pending = undefined;

  transitioning = false;

  for (const type of DROPPED_EVENTS) window.removeEventListener(type, drop, true);
}

function drop(event: Event) {
  event.stopImmediatePropagation();
  event.preventDefault();
}

function awaitClaim(path: string) {
  pending = path;

  claimTimer = setTimeout(finish, CLAIM_MS);
}

function claim(el: HTMLElement, pathname: string) {
  clearTimeout(claimTimer);

  pending = undefined;

  void play(el, enterHalf(pathname)).then(finish);
}

function play(el: HTMLElement, half: Half): Promise<unknown> {
  const animations = [...rootAnimation(el, half), ...rowAnimations(el, half)];

  return Promise.allSettled(animations.map((animation) => animation.finished));
}

function rootAnimation(el: HTMLElement, { root: motion }: Half): Animation[] {
  return motion ? [el.animate(motion.keyframes, motion.options)] : [];
}

function rowAnimations(el: HTMLElement, { row }: Half): Animation[] {
  if (row === undefined) return [];

  const rows = Array.from(el.querySelectorAll<HTMLElement>(ROWS));

  return rows.map((child, i) => child.animate(row(i).keyframes, row(i).options));
}
