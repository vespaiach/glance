import {
  barHeight,
  barIdleDue,
  barLayoutHeight,
  barReducer,
  initialBar,
  navLabelsShown,
  offlinePillBottom,
} from "./bar";

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
  expect(offlinePillBottom(breakpoint, "docked")).toBe(bottom);
});

test("SHELL-07 the offline pill on phone sits above the handle while the bar is hidden", () => {
  expect(offlinePillBottom("phone", "hidden")).toBe(68);
  expect(offlinePillBottom("phone", "floating")).toBe(84);
  expect(offlinePillBottom("wide", "hidden")).toBe(24);
});

test.each([
  ["docked", "wide", 88],
  ["docked", "phone", 72],
  ["floating", "wide", 0],
  ["hidden", "narrow", 0],
] as const)("SHELL-06 a %s bar on %s takes %i px of the layout", (mode, breakpoint, height) => {
  expect(barLayoutHeight(mode, breakpoint)).toBe(height);
});

test.each([
  ["docked", "hidden"],
  ["floating", "hidden"],
  ["hidden", "hidden"],
] as const)("SHELL-06 idle turns a %s bar %s", (mode, next) => {
  expect(barReducer({ mode }, { type: "idle" })).toEqual({ mode: next });
});

test("SHELL-07 a touch reveals a hidden bar floating", () => {
  expect(barReducer({ mode: "hidden" }, { type: "touch" })).toEqual({ mode: "floating" });
});

test.each(["docked", "floating"] as const)("SHELL-07 a touch keeps a %s bar as it is", (mode) => {
  const state = { mode };

  expect(barReducer(state, { type: "touch" })).toBe(state);
});

test("SHELL-07 a view change docks a floating bar", () => {
  expect(barReducer({ mode: "floating" }, { type: "viewChanged" })).toEqual({ mode: "docked" });
});

test.each(["docked", "hidden"] as const)("IDLE-01 a view change keeps a %s bar", (mode) => {
  const state = { mode };

  expect(barReducer(state, { type: "viewChanged" })).toBe(state);
});

test.each([
  [undefined, "docked"],
  ["hidden", "hidden"],
  ["float", "floating"],
] as const)("SHELL-07 the fixture bar=%s starts the bar %s", (fixture, mode) => {
  expect(initialBar(fixture)).toEqual({ mode });
});

test.each([
  [19_999, false],
  [20_000, true],
] as const)("SHELL-06 %i ms without a touch is idle: %s", (elapsed, due) => {
  const lastTouch = new Date("2026-10-09T17:41:00Z");

  expect(barIdleDue(lastTouch, new Date(lastTouch.getTime() + elapsed))).toBe(due);
});
