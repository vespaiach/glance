import { isAmbientHop } from "./ambientTransition";
import { VIEWS, viewPath } from "./routes";

export type PageMotion = {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
};

const SLIDE_PX = 32;

const LIFT_PX = 16;

const SLIDE_MS = 280;

const CALM_MS = 600;

const SLIDE_EASING = "cubic-bezier(0.2, 0, 0, 1)";

const CALM_EASING = "ease-in-out";

const CALM_PATHS: readonly string[] = ["/signin"];

function isCalm(path: string): boolean {
  return CALM_PATHS.includes(path);
}

function viewIndex(path: string): number {
  return VIEWS.findIndex((view) => viewPath(view) === path);
}

function slideDistance(from: string, to: string): number {
  const i = viewIndex(from);

  const j = viewIndex(to);

  if (i === -1 || j === -1 || i === j) return 0;

  return j > i ? SLIDE_PX : -SLIDE_PX;
}

function enter(offset: string | undefined, duration: number, easing: string): PageMotion {
  const start: Keyframe = offset === undefined ? { opacity: 0 } : { opacity: 0, transform: offset };

  const end: Keyframe = offset === undefined ? { opacity: 1 } : { opacity: 1, transform: "none" };

  return { keyframes: [start, end], options: { duration, easing } };
}

export function pageMotion(from: string | undefined, to: string): PageMotion | undefined {
  if (from === undefined || from === to || isAmbientHop(from, to)) return undefined;

  if (isCalm(from) || isCalm(to)) return enter(undefined, CALM_MS, CALM_EASING);

  const dx = slideDistance(from, to);

  if (dx !== 0) return enter(`translateX(${dx}px)`, SLIDE_MS, SLIDE_EASING);

  return enter(`translateY(${LIFT_PX}px)`, SLIDE_MS, SLIDE_EASING);
}
