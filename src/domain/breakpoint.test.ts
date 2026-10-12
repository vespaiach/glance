import { breakpointFor } from "./breakpoint";

describe("breakpointFor", () => {
  it.each([
    [1920, "wide"],
    [1200, "wide"],
    [1199, "mid"],
    [1000, "mid"],
    [999, "narrow"],
    [600, "narrow"],
    [599, "phone"],
    [390, "phone"],
  ])("spec§5.1 width %i is %s", (width, expected) => {
    expect(breakpointFor(width)).toBe(expected);
  });
});
