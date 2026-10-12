import { formatMonthYear, monthCells, weekdayInitials } from "./month";

describe("month", () => {
  it("CAL-01 October 2026 starts on Thursday and fills five whole weeks", () => {
    const cells = monthCells(2026, 9);

    expect(cells.slice(0, 5)).toEqual([null, null, null, null, 1]);
    expect(cells).toHaveLength(35);
    expect(cells.at(-1)).toBe(31);
  });

  it("CAL-01 November 2026 pads the last week with blanks", () => {
    const cells = monthCells(2026, 10);

    expect(cells[0]).toBe(1);
    expect(cells).toHaveLength(35);
    expect(cells.slice(29)).toEqual([30, null, null, null, null, null]);
  });

  it("CAL-01 February 2026 fills exactly four weeks", () => {
    const cells = monthCells(2026, 1);

    expect(cells).toHaveLength(28);
    expect(cells[0]).toBe(1);
    expect(cells.at(-1)).toBe(28);
  });

  it("CAL-01 leap-year February has 29 days", () => {
    expect(monthCells(2028, 1).filter((day) => day !== null)).toHaveLength(29);
  });

  it("spec§4.2 month title reads the full month name and year", () => {
    expect(formatMonthYear(2026, 9)).toBe("October 2026");
    expect(formatMonthYear(2027, 0)).toBe("January 2027");
  });

  it("spec§4.2 weekday initials run Sunday to Saturday", () => {
    expect(weekdayInitials()).toEqual(["S", "M", "T", "W", "T", "F", "S"]);
  });
});
