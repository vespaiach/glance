import { todayLayout } from "./layout";

describe("todayLayout", () => {
  it.each([
    ["large", "threeColumn"],
    ["normal", "twoColumn"],
    ["small", "stacked"],
  ] as const)("TODAY-14 %s is %s", (breakpoint, grid) => {
    expect(todayLayout(breakpoint)).toBe(grid);
  });
});
