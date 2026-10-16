import { calendarCell, dayRevealScroll } from "./layout";

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

describe("dayRevealScroll", () => {
  it.each([
    [900, 700, 420],
    [481, 700, 1],
  ])(
    "CAL-07 a day list at %i px in a %i px view scrolls %i px to show the heading and first event",
    (top, height, scroll) => {
      expect(dayRevealScroll(top, height)).toBe(scroll);
    },
  );

  it.each([
    [480, 700],
    [300, 700],
    [-200, 700],
  ])("CAL-07 a day list at %i px in a %i px view stays put", (top, height) => {
    expect(dayRevealScroll(top, height)).toBe(0);
  });
});
