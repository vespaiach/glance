import { enterHalf, isAmbientHop, leaveHalf } from "./ambientTransition";

test("AMB-10 only a move to or from Ambient is an ambient hop", () => {
  expect(isAmbientHop("/today", "/ambient")).toBe(true);
  expect(isAmbientHop("/ambient", "/signin")).toBe(true);
  expect(isAmbientHop("/today", "/calendar")).toBe(false);
  expect(isAmbientHop("/ambient", "/ambient")).toBe(false);
});

test("AMB-10 leaving a view dims it to 25% and scales it to 98.5% over 420ms ease-in", () => {
  const half = leaveHalf("/today");

  expect(half.root).toEqual({
    keyframes: [
      { filter: "brightness(1)", transform: "scale(1)" },
      { filter: "brightness(0.25)", transform: "scale(0.985)" },
    ],
    options: { duration: 420, easing: "ease-in", fill: "forwards" },
  });
  expect(half.row).toBeUndefined();
});

test("AMB-10 leaving Ambient fades each row out and lifts it 12px, 240ms, 40ms apart", () => {
  const half = leaveHalf("/ambient");

  expect(half.root).toBeUndefined();
  expect(half.row?.(2)).toEqual({
    keyframes: [
      { opacity: 1, transform: "none" },
      { opacity: 0, transform: "translateY(-12px)" },
    ],
    options: { duration: 240, delay: 80, easing: "ease-in", fill: "forwards" },
  });
});

test("AMB-10 arriving on Ambient brightens from 30% over 700ms while rows rise 16px, 120ms apart from 200ms", () => {
  const half = enterHalf("/ambient");

  expect(half.root).toEqual({
    keyframes: [{ filter: "brightness(0.3)" }, { filter: "brightness(1)" }],
    options: { duration: 700, easing: "ease-out" },
  });
  expect(half.row?.(1)).toEqual({
    keyframes: [
      { opacity: 0, transform: "translateY(16px)" },
      { opacity: 1, transform: "none" },
    ],
    options: { duration: 600, delay: 320, easing: "ease-out", fill: "backwards" },
  });
});

test("AMB-10 arriving on a view brightens it from 25% and 98.5% to full over 520ms", () => {
  const half = enterHalf("/today");

  expect(half.root).toEqual({
    keyframes: [
      { filter: "brightness(0.25)", transform: "scale(0.985)" },
      { filter: "brightness(1)", transform: "scale(1)" },
    ],
    options: { duration: 520, easing: "ease-out" },
  });
  expect(half.row).toBeUndefined();
});
