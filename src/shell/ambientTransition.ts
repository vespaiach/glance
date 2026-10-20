export type Motion = {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
};

export type Half = {
  root?: Motion;
  row?: (index: number) => Motion;
};

export const AMBIENT_PATH = "/ambient";

const FULL: Keyframe = { filter: "brightness(1)", transform: "scale(1)" };

const DIMMED: Keyframe = { filter: "brightness(0.25)", transform: "scale(0.985)" };

const SHOWN_ROW: Keyframe = { opacity: 1, transform: "none" };

const VIEW_LEAVE: Motion = {
  keyframes: [FULL, DIMMED],
  options: { duration: 420, easing: "ease-in", fill: "forwards" },
};

const VIEW_ENTER: Motion = {
  keyframes: [DIMMED, FULL],
  options: { duration: 520, easing: "ease-out" },
};

const AMBIENT_ENTER: Motion = {
  keyframes: [{ filter: "brightness(0.3)" }, { filter: "brightness(1)" }],
  options: { duration: 700, easing: "ease-out" },
};

export function isAmbientHop(from: string, to: string): boolean {
  return from !== to && (from === AMBIENT_PATH || to === AMBIENT_PATH);
}

export function leaveHalf(from: string): Half {
  if (from === AMBIENT_PATH) return { row: rowLeave };

  return { root: VIEW_LEAVE };
}

export function enterHalf(to: string): Half {
  if (to === AMBIENT_PATH) return { root: AMBIENT_ENTER, row: rowEnter };

  return { root: VIEW_ENTER };
}

function rowLeave(index: number): Motion {
  return {
    keyframes: [SHOWN_ROW, { opacity: 0, transform: "translateY(-12px)" }],
    options: { duration: 240, delay: index * 40, easing: "ease-in", fill: "forwards" },
  };
}

function rowEnter(index: number): Motion {
  return {
    keyframes: [{ opacity: 0, transform: "translateY(16px)" }, SHOWN_ROW],
    options: { duration: 600, delay: 200 + index * 120, easing: "ease-out", fill: "backwards" },
  };
}
