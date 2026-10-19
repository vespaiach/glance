import {
  atMinute,
  clockAt,
  formatClock,
  formatDayTitle,
  formatDuration,
  formatHour,
  formatLength,
  formatLongDate,
  formatMonth,
  formatMonthDay,
  formatRange,
  formatWeekday,
  minutesOfDay,
  rangeParts,
  timeParts,
} from "./time";
import { deviceTimeZone, parseDateKey } from "./zone";

const tz = deviceTimeZone();

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
    [at(12, 0), at(13, 0), "12h", { time: "12:00 – 1:00", meridiem: "PM" }],
    [at(11, 30), at(12, 15), "12h", { time: "11:30 AM – 12:15", meridiem: "PM" }],
    [at(15, 30), undefined, "12h", { time: "3:30", meridiem: "PM" }],
    [at(12, 0), at(13, 0), "24h", { time: "12:00 – 13:00" }],
  ] as const)("EVT-09 details time %i–%s in %s reads %o", (start, end, clock, expected) => {
    expect(rangeParts(start, end, clock)).toEqual(expected);
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

  it.each([
    [45, "45 min"],
    [75, "1 h 15 min"],
    [120, "2 h"],
    [960, "16 h"],
  ])("TL-08 a free length of %i minutes reads %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });

  it("TIME-01 minutesOfDay reads the local time of day", () => {
    expect(minutesOfDay(new Date(2026, 9, 9, 10, 41, 59), tz)).toBe(at(10, 41));
  });

  it("D15 atMinute puts minutes of the day on that local day", () => {
    expect(atMinute("2026-10-09", at(13, 30), tz)).toEqual(new Date(2026, 9, 9, 13, 30));
  });

  it("AMB-03 weekday and month-day labels are short English names", () => {
    expect(formatWeekday(new Date(2026, 9, 10), tz)).toBe("Sat");
    expect(formatMonthDay(new Date(2026, 9, 2), tz)).toBe("Oct 2");
  });

  it.each([
    [new Date(2026, 9, 9, 10, 41), "Friday, October 9"],
    [new Date(2027, 0, 1), "Friday, January 1"],
  ])("TIME-01 clock date of %s reads %s", (date, expected) => {
    expect(formatLongDate(date, tz)).toBe(expected);
  });

  it("TODAY-01 the season eyebrow names the month in full", () => {
    expect(formatMonth(new Date(2026, 9, 9), tz)).toBe("October");
  });

  it.each([
    [new Date(2026, 9, 9), "Friday, Oct 9"],
    [new Date(2027, 0, 14), "Thursday, Jan 14"],
  ])("CAL-01 the day heading of %s reads %s", (date, expected) => {
    expect(formatDayTitle(date, tz)).toBe(expected);
  });
});

describe("time in a zone", () => {
  const LA = "America/Los_Angeles";
  const friday = new Date("2026-10-10T06:30:00Z");

  it("LOC-06 minutesOfDay reads the wall time in the given zone, not the device's", () => {
    expect(minutesOfDay(friday, LA)).toBe(at(23, 30));
  });

  it("LOC-06 atMinute puts minutes of the day on that day in the given zone", () => {
    expect(atMinute("2026-10-09", at(13, 30), LA).toISOString()).toBe("2026-10-09T20:30:00.000Z");
  });

  it("LOC-06 clockAt formats an instant's wall time in the zone", () => {
    expect(clockAt(friday.toISOString(), "12h", LA)).toBe("11:30 PM");
    expect(clockAt(friday.toISOString(), "24h", LA)).toBe("23:30");
  });

  it("LOC-06 date names follow the given zone", () => {
    expect(formatWeekday(friday, LA)).toBe("Fri");
    expect(formatMonthDay(friday, LA)).toBe("Oct 9");
    expect(formatLongDate(friday, LA)).toBe("Friday, October 9");
    expect(formatDayTitle(friday, LA)).toBe("Friday, Oct 9");
    expect(formatMonth(new Date("2026-11-01T06:30:00Z"), LA)).toBe("October");
  });

  it("D15 a date with no time reads its own day when formatted in UTC", () => {
    expect(formatWeekday(parseDateKey("2026-10-10"), "UTC")).toBe("Sat");
  });
});
