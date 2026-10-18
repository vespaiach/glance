import { todayCapacity, todayLayout } from "./layout";

const base = { portrait: false, allDayCount: 0 };

describe("todayCapacity", () => {
  it.each([
    ["wide", 1080, 8],
    ["wide", 900, 7],
    ["wide", 800, 5],
    ["mid", 820, 6],
    ["wide", 600, 4],
    ["wide", 1600, 8],
  ] as const)(
    "TODAY-11 %s at %i px high fits %i rows, with no bar taking height",
    (bp, windowHeight, rows) => {
      expect(todayCapacity({ ...base, bp, windowHeight })).toBe(rows);
    },
  );

  it("TODAY-11 each all-day tile takes 64 px", () => {
    expect(todayCapacity({ ...base, bp: "wide", windowHeight: 900, allDayCount: 1 })).toBe(6);
  });

  it.each([
    ["mid", true],
    ["narrow", true],
    ["narrow", false],
    ["phone", true],
  ] as const)("TODAY-11 %s (portrait %s) fits 6 rows", (bp, portrait) => {
    expect(todayCapacity({ ...base, bp, portrait, windowHeight: 1180, allDayCount: 2 })).toBe(6);
  });
});

describe("todayLayout", () => {
  it.each([
    [1920, 1080, "landscape", 2],
    [1440, 900, "landscape", 1],
    [1280, 800, "landscape", 1],
    [1180, 820, "landscape", 1],
    [820, 1180, "portrait", 2],
    [390, 844, "stacked", 2],
    [2560, 1440, "landscape", 2],
    [1600, 900, "landscape", 2],
    [1599, 900, "landscape", 1],
    [768, 768, "landscape", 1],
    [768, 769, "portrait", 2],
    [767, 400, "stacked", 2],
  ] as const)("TODAY-13 %i×%i is %s with %i note columns", (width, height, grid, noteColumns) => {
    expect(todayLayout(width, height)).toEqual({ grid, noteColumns });
  });
});
