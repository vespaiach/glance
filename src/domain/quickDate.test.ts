import { monthCells, monthOf, monthTitle, stepMonth } from "./quickDate";

describe("monthCells", () => {
  it("EVT-12 the grid pads the first week to its Sunday-first weekday", () => {
    const cells = monthCells("2026-10");

    expect(cells.slice(0, 5)).toEqual([null, null, null, null, "2026-10-01"]);
    expect(cells.filter((cell) => cell !== null)).toHaveLength(31);
    expect(cells.at(-1)).toBe("2026-10-31");
  });

  it("EVT-12 a month starting on Sunday has no padding", () => {
    expect(monthCells("2026-11")[0]).toBe("2026-11-01");
  });
});

describe("stepMonth and monthOf", () => {
  it("EVT-12 steps across the year boundary", () => {
    expect(stepMonth("2026-12", 1)).toBe("2027-01");
    expect(stepMonth("2026-01", -1)).toBe("2025-12");
  });

  it("EVT-12 monthOf reads the month of a day", () => {
    expect(monthOf("2026-10-09")).toBe("2026-10");
  });
});

describe("monthTitle", () => {
  it("EVT-12 names the month and year", () => {
    expect(monthTitle("2026-10")).toBe("October 2026");
  });
});
