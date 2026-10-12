import {
  formatClock,
  formatHour,
  formatLength,
  formatMonthDay,
  formatRange,
  formatWeekday,
  localDateKey,
  minutesOfDay,
  parseLocalDate,
  timeParts,
} from "./time";

const at = (h: number, m: number) => h * 60 + m;

describe("time", () => {
  it.each([
    [at(10, 41), "12h", "10:41 AM"],
    [at(18, 42), "12h", "6:42 PM"],
    [at(0, 5), "12h", "12:05 AM"],
    [at(12, 0), "12h", "12:00 PM"],
    [at(10, 41), "24h", "10:41"],
    [at(18, 42), "24h", "18:42"],
    [at(9, 0), "24h", "09:00"],
    [at(0, 5), "24h", "00:05"],
  ] as const)("TIME-01 clock format of %i in %s is %s", (minutes, clock, expected) => {
    expect(formatClock(minutes, clock)).toBe(expected);
  });

  it.each([
    [at(10, 41), "12h", { time: "10:41", meridiem: "AM" }],
    [at(23, 55), "12h", { time: "11:55", meridiem: "PM" }],
    [at(23, 55), "24h", { time: "23:55" }],
  ] as const)("TIME-01 splits %i in %s into time and mono AM/PM", (minutes, clock, expected) => {
    expect(timeParts(minutes, clock)).toEqual(expected);
  });

  it.each([
    [at(10, 30), at(11, 15), "12h", "10:30 – 11:15"],
    [at(14, 0), at(14, 20), "12h", "2:00 – 2:20"],
    [at(14, 0), at(14, 20), "24h", "14:00 – 14:20"],
    [at(9, 0), at(9, 30), "24h", "09:00 – 09:30"],
    [at(15, 30), undefined, "12h", "3:30"],
  ] as const)("TIME-01 row range %i–%s in %s is %s", (start, end, clock, expected) => {
    expect(formatRange(start, end, clock)).toBe(expected);
  });

  it.each([
    [at(16, 0), "12h", "4 PM"],
    [at(11, 0), "12h", "11 AM"],
    [at(0, 0), "12h", "12 AM"],
    [at(12, 0), "12h", "12 PM"],
    [at(16, 0), "24h", "16:00"],
    [at(7, 0), "24h", "07:00"],
  ] as const)("TIME-01 hourly forecast %i in %s is %s", (minutes, clock, expected) => {
    expect(formatHour(minutes, clock)).toBe(expected);
  });

  it.each([
    [20, "20 min"],
    [45, "45 min"],
    [60, "1 hr"],
    [90, "1 hr 30 min"],
    [120, "2 hr"],
  ])("TPK-01 length of %i minutes reads %s", (minutes, expected) => {
    expect(formatLength(minutes)).toBe(expected);
  });

  it("TIME-01 minutesOfDay reads the local time of day", () => {
    expect(minutesOfDay(new Date(2026, 9, 9, 10, 41, 59))).toBe(at(10, 41));
  });

  it("TIME-01 localDateKey and parseLocalDate round-trip a local date", () => {
    const day = new Date(2026, 9, 9, 23, 59);

    expect(localDateKey(day)).toBe("2026-10-09");
    expect(parseLocalDate("2026-10-09")).toEqual(new Date(2026, 9, 9));
  });

  it("AMB-03 weekday and month-day labels are short English names", () => {
    expect(formatWeekday(new Date(2026, 9, 10))).toBe("Sat");
    expect(formatMonthDay(new Date(2026, 9, 2))).toBe("Oct 2");
  });
});
