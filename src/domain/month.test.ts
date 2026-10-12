import { formatMonthYear, markedDays, monthCells, monthTitle, weekdayInitials } from "./month";

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

  it("CAL-03 the month heading names the month alone in the current year", () => {
    expect(monthTitle(2026, 9, new Date(2026, 9, 9))).toBe("October");
  });

  it("CAL-03 the month heading adds the year outside the current year", () => {
    expect(monthTitle(2027, 0, new Date(2026, 9, 9))).toBe("January 2027");
  });

  it("CAL-02 marked days list each local day with an event once, in order", () => {
    const startAt = (day: number, hour: number) => new Date(2026, 9, day, hour).toISOString();

    const events = [
      { startAt: startAt(9, 9) },
      { startAt: startAt(9, 15) },
      { startAt: startAt(2, 19) },
    ];

    expect(markedDays(events)).toEqual([2, 9]);
  });
});
