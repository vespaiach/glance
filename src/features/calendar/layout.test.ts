import { calendarCell } from "./layout";

describe("calendarCell", () => {
  it.each([
    ["wide", 1920, 60],
    ["wide", 1280, 60],
    ["mid", 1180, 54],
  ] as const)("spec§5.3 the %s month cell at %i px is %i", (breakpoint, width, cell) => {
    expect(calendarCell(breakpoint, width)).toBe(cell);
  });

  it("spec§5.3 the narrow month cell grows up to 84 px", () => {
    expect(calendarCell("narrow", 820)).toBe(84);
  });

  it("spec§5.3 the narrow month cell shrinks to fit at the low end", () => {
    expect(calendarCell("narrow", 600)).toBe(69);
  });

  it.each([
    [390, 40],
    [320, 36],
  ])("spec§5.4 the phone month cell at %i px is %i", (width, cell) => {
    expect(calendarCell("phone", width)).toBe(cell);
  });
});
