import { todayCapacity } from "./layout";

const base = { portrait: false, barHeight: 88, allDayCount: 0 };

describe("todayCapacity", () => {
  it.each([
    ["wide", 1080, 8],
    ["wide", 900, 5],
    ["wide", 800, 4],
    ["mid", 820, 4],
    ["wide", 600, 4],
    ["wide", 1600, 8],
  ] as const)("TODAY-11 %s at %i px high fits %i rows", (bp, windowHeight, rows) => {
    expect(todayCapacity({ ...base, bp, windowHeight })).toBe(rows);
  });

  it("TODAY-11 each all-day tile takes 64 px", () => {
    expect(todayCapacity({ ...base, bp: "wide", windowHeight: 1080, allDayCount: 1 })).toBe(7);
  });

  it("TODAY-11 a hidden bar has no height, so more rows fit", () => {
    expect(todayCapacity({ ...base, bp: "wide", windowHeight: 900, barHeight: 0 })).toBe(7);
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
