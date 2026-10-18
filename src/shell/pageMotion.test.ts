import { pageMotion } from "./pageMotion";

const SLIDE_EASING = "cubic-bezier(0.2, 0, 0, 1)";

test("tech§4.4 going forward between views slides in from 32px to the right", () => {
  expect(pageMotion("/today", "/calendar")).toEqual({
    keyframes: [
      { opacity: 0, transform: "translateX(32px)" },
      { opacity: 1, transform: "none" },
    ],
    options: { duration: 280, easing: SLIDE_EASING },
  });
});

test("tech§4.4 going back between views slides in from 32px to the left", () => {
  expect(pageMotion("/photos", "/notes")).toEqual({
    keyframes: [
      { opacity: 0, transform: "translateX(-32px)" },
      { opacity: 1, transform: "none" },
    ],
    options: { duration: 280, easing: SLIDE_EASING },
  });
});

test("tech§4.4 a sub-page rises 16px from below, not sideways", () => {
  expect(pageMotion("/settings", "/settings/background")).toEqual({
    keyframes: [
      { opacity: 0, transform: "translateY(16px)" },
      { opacity: 1, transform: "none" },
    ],
    options: { duration: 280, easing: SLIDE_EASING },
  });
});

test("tech§4.4 leaving a sub-page for a view rises 16px, not sideways", () => {
  expect(pageMotion("/settings/location", "/settings")).toEqual({
    keyframes: [
      { opacity: 0, transform: "translateY(16px)" },
      { opacity: 1, transform: "none" },
    ],
    options: { duration: 280, easing: SLIDE_EASING },
  });
});

test("tech§4.4 entering Ambient only fades in, over 600ms", () => {
  expect(pageMotion("/today", "/ambient")).toEqual({
    keyframes: [{ opacity: 0 }, { opacity: 1 }],
    options: { duration: 600, easing: "ease-in-out" },
  });
});

test("tech§4.4 leaving Ambient only fades in, over 600ms", () => {
  expect(pageMotion("/ambient", "/today")).toEqual({
    keyframes: [{ opacity: 0 }, { opacity: 1 }],
    options: { duration: 600, easing: "ease-in-out" },
  });
});

test("tech§4.4 sign-in only fades in, both going in and out", () => {
  const fade = {
    keyframes: [{ opacity: 0 }, { opacity: 1 }],
    options: { duration: 600, easing: "ease-in-out" },
  };

  expect(pageMotion("/today", "/signin")).toEqual(fade);
  expect(pageMotion("/signin", "/today")).toEqual(fade);
});

test("tech§4.4 navigating to the same path plays nothing", () => {
  expect(pageMotion("/calendar", "/calendar")).toBeUndefined();
});

test("tech§4.4 the first view shown plays nothing", () => {
  expect(pageMotion(undefined, "/today")).toBeUndefined();
});
