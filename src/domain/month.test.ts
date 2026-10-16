import {
  formatMonthYear,
  markedDays,
  monthCells,
  monthTitle,
  readDateParam,
  stepMonth,
  weekdayInitials,
} from "./month";
import { deviceTimeZone } from "./zone";

const tz = deviceTimeZone();

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
    expect(monthTitle(2026, 9, new Date(2026, 9, 9), tz)).toBe("October");
  });

  it("CAL-03 the month heading adds the year outside the current year", () => {
    expect(monthTitle(2027, 0, new Date(2026, 9, 9), tz)).toBe("January 2027");
  });

  it("CAL-02 marked days list each local day with an event once, in order", () => {
    const startAt = (day: number, hour: number) => new Date(2026, 9, day, hour).toISOString();

    const events = [
      { startAt: startAt(9, 9) },
      { startAt: startAt(9, 15) },
      { startAt: startAt(2, 19) },
    ];

    expect(markedDays(events, tz)).toEqual([2, 9]);
  });

  const NOW = new Date(2026, 9, 9, 10, 41);

  it.each([
    ["2026-10-14", 1, "2026-11-01"],
    ["2026-10-14", -1, "2026-09-01"],
    ["2026-12-25", 1, "2027-01-01"],
    ["2027-01-25", -1, "2026-12-01"],
  ] as const)("CAL-03 stepping from %s by %i selects the 1st, %s", (selected, delta, expected) => {
    expect(stepMonth(selected, delta, NOW, tz)).toBe(expected);
  });

  it.each([
    ["2026-09-01", 1],
    ["2026-11-30", -1],
  ] as const)(
    "CAL-03 stepping from %s by %i into the current month selects today",
    (selected, delta) => {
      expect(stepMonth(selected, delta, NOW, tz)).toBe("2026-10-09");
    },
  );

  it("CAL-03 stepping into this month in another year selects the 1st", () => {
    expect(stepMonth("2027-11-01", -1, NOW, tz)).toBe("2027-10-01");
  });

  it.each(["2026-10-14", "2028-02-29"])("CAL-01 ?date=%s opens on that day", (value) => {
    expect(readDateParam(value)).toBe(value);
  });

  it.each([null, "", "2026-1-4", "2026-02-30", "2026-13-01", "tomorrow", "2026-10-14T10:00"])(
    "CAL-01 ?date=%s is ignored",
    (value) => {
      expect(readDateParam(value)).toBeUndefined();
    },
  );
});

describe("month in a zone", () => {
  const LA = "America/Los_Angeles";

  it("LOC-06 the month heading reads the current year in the given zone", () => {
    expect(monthTitle(2027, 0, new Date("2027-01-01T06:00:00Z"), LA)).toBe("January 2027");
  });

  it("LOC-06 marked days are the days in the given zone", () => {
    expect(markedDays([{ startAt: "2026-10-10T06:30:00Z" }], LA)).toEqual([9]);
  });

  it.each([LA, "Pacific/Guam"])(
    "CAL-02 a day with only an all-day event is marked on its date in %s",
    (zone) => {
      const events = [
        { startAt: "2026-10-01T00:00:00.000Z", allDay: true as const },
        { startAt: "2026-10-16T00:00:00.000Z", allDay: true as const },
      ];

      expect(markedDays(events, zone)).toEqual([1, 16]);
    },
  );

  it("LOC-06 stepping into the current month selects today in the given zone", () => {
    expect(stepMonth("2026-09-14", 1, new Date("2026-10-10T06:30:00Z"), LA)).toBe("2026-10-09");
  });
});
