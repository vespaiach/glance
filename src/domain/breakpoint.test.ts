import { breakpointFor, layoutSize } from "./breakpoint";

describe("breakpointFor", () => {
  it.each([
    [1920, "large"],
    [1201, "large"],
    [1200, "normal"],
    [1024, "normal"],
    [769, "normal"],
    [768, "small"],
    [390, "small"],
  ])("spec§5.1 width %i is %s", (width, expected) => {
    expect(breakpointFor(width)).toBe(expected);
  });
});

describe("layoutSize", () => {
  it.each([
    ["large", "large"],
    ["normal", "large"],
    ["small", "small"],
  ] as const)("D26 %s takes the %s layout record", (breakpoint, expected) => {
    expect(layoutSize(breakpoint)).toBe(expected);
  });
});
