import { scheduleRows, todayLayout } from "./layout";

describe("scheduleRows", () => {
  it.each([
    [760, 76, 10],
    [456, 76, 6],
    [455, 76, 5],
    [500, 100, 5],
    [152, 76, 2],
    [151, 76, 2],
    [0, 76, 2],
    [-40, 76, 2],
    [1200, 76, 10],
    [1200, 114, 10],
  ])("TODAY-11 %i px left with %i px rows fits %i rows", (available, rowHeight, rows) => {
    expect(scheduleRows({ available, rowHeight })).toBe(rows);
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
