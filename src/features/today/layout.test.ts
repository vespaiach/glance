import { fitNotes, todayLayout } from "./layout";

describe("todayLayout", () => {
  it.each([
    ["large", "threeColumn"],
    ["normal", "twoColumn"],
    ["small", "stacked"],
  ] as const)("TODAY-14 %s is %s", (breakpoint, grid) => {
    expect(todayLayout(breakpoint)).toBe(grid);
  });
});

describe("fitNotes", () => {
  it("TODAY-09 large shows two notes when both fit above Today’s photo", () => {
    expect(fitNotes("large", { room: 400, need: 400 })).toBe(2);
  });

  it("TODAY-09 large shows one note when two don’t fit above Today’s photo", () => {
    expect(fitNotes("large", { room: 400, need: 401 })).toBe(1);
  });

  it("TODAY-09 large shows two notes until the box is measured", () => {
    expect(fitNotes("large", null)).toBe(2);
  });

  it.each(["normal", "small"] as const)("TODAY-09 %s shows up to two notes", (breakpoint) => {
    expect(fitNotes(breakpoint, { room: 100, need: 400 })).toBe(2);
  });
});
