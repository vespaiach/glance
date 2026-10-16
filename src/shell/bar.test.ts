import { barHeight, navLabelsShown, offlinePillBottom } from "./bar";

test.each([
  ["wide", true, 88],
  ["mid", true, 88],
  ["narrow", false, 72],
  ["phone", false, 72],
] as const)(
  "SHELL-01 on %s labels shown is %s and the bar is %i px",
  (breakpoint, labels, height) => {
    expect(navLabelsShown(breakpoint)).toBe(labels);
    expect(barHeight(breakpoint)).toBe(height);
  },
);

test.each([
  ["wide", 24],
  ["mid", 24],
  ["narrow", 12],
  ["phone", 84],
] as const)("OFF-01 the offline pill sits %s px from the bottom on %s", (breakpoint, bottom) => {
  expect(offlinePillBottom(breakpoint)).toBe(bottom);
});
