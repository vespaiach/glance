import {
  defaultEnd,
  defaultTimes,
  endForLength,
  endsAfterStart,
  isEndHourDisabled,
  isEndMinuteDisabled,
  moveStart,
  nextWholeHour,
  pickEnd,
  pickerHours,
  pickerMinutes,
  slotTimes,
  withHour,
  withMeridiem,
  withMinute,
} from "./eventTimes";
import { deviceTimeZone } from "./zone";

const tz = deviceTimeZone();

const at = (h: number, m: number) => h * 60 + m;
const today = (h: number, m: number) => new Date(2026, 9, 9, h, m);

describe("eventTimes", () => {
  it.each([
    [today(10, 41), at(11, 0)],
    [today(11, 0), at(12, 0)],
    [today(11, 59), at(12, 0)],
    [today(0, 0), at(1, 0)],
    [today(22, 0), at(23, 0)],
    [today(23, 0), at(23, 0)],
    [today(23, 59), at(23, 0)],
  ])("TPK-05 next whole hour after %s is minute %i, capped at 11:00 PM", (now, expected) => {
    expect(nextWholeHour(now, tz)).toBe(expected);
  });

  it.each([
    [today(10, 41), { start: at(11, 0), end: at(12, 0) }],
    [today(22, 10), { start: at(23, 0), end: at(23, 55) }],
    [today(23, 45), { start: at(23, 0), end: at(23, 55) }],
  ])("TPK-05 a new event at %s defaults to %o", (now, expected) => {
    expect(defaultTimes(now, tz)).toEqual(expected);
  });

  it.each([
    [{ start: at(11, 0), end: at(12, 0) }, at(23, 55), { start: at(23, 50), end: at(23, 55) }],
    [{ start: at(11, 0) }, at(23, 55), { start: at(23, 55) }],
  ])("TPK-07 moving %o to start %i leaves room for the end: %o", (times, start, expected) => {
    expect(moveStart(times, start)).toEqual(expected);
  });

  it.each([
    [at(11, 0), at(12, 0), at(12, 0)],
    [at(11, 0), at(10, 30), at(11, 5)],
    [at(11, 0), at(11, 0), at(11, 5)],
    [at(23, 0), at(23, 55), at(23, 55)],
  ])("TPK-07 an end pick after start %i of %i lands on %i", (start, end, expected) => {
    expect(pickEnd(start, end)).toBe(expected);
  });

  it.each([
    [at(11, 0), 10, true],
    [at(11, 0), 11, false],
    [at(11, 50), 11, false],
    [at(11, 55), 11, true],
    [at(11, 55), 12, false],
  ])("TPK-07 with start %i the end hour %i is disabled: %s", (start, hour, expected) => {
    expect(isEndHourDisabled(start, hour)).toBe(expected);
  });

  it.each([
    [at(11, 0), 11, 0, true],
    [at(11, 0), 11, 5, false],
    [at(11, 30), 11, 30, true],
    [at(11, 30), 11, 35, false],
    [at(11, 30), 12, 0, false],
    [at(11, 30), 10, 55, true],
  ])("TPK-07 with start %i the end cell %i:%i is disabled: %s", (start, hour, minute, expected) => {
    expect(isEndMinuteDisabled(start, hour, minute)).toBe(expected);
  });

  it.each([
    [{ start: at(11, 0), end: at(12, 0) }, at(14, 0), { start: at(14, 0), end: at(15, 0) }],
    [{ start: at(11, 0), end: at(11, 45) }, at(10, 0), { start: at(10, 0), end: at(10, 45) }],
    [{ start: at(11, 0), end: at(13, 0) }, at(23, 0), { start: at(23, 0), end: at(23, 55) }],
    [{ start: at(11, 0) }, at(14, 0), { start: at(14, 0) }],
    [{ start: at(11, 0), end: at(11, 0) }, at(14, 0), { start: at(14, 0), end: at(11, 0) }],
    [{ start: at(11, 0), end: at(10, 0) }, at(14, 0), { start: at(14, 0), end: at(10, 0) }],
  ])("TPK-06 moving %o to start %i gives %o", (times, start, expected) => {
    expect(moveStart(times, start)).toEqual(expected);
  });

  it.each([
    [at(11, 0), at(12, 0)],
    [at(23, 0), at(23, 55)],
  ])("TPK-08 tapping an empty Ends after start %i fills %i", (start, expected) => {
    expect(defaultEnd(start)).toBe(expected);
  });

  it.each([
    [{ start: at(11, 0), end: at(11, 5) }, true],
    [{ start: at(11, 0) }, true],
    [{ start: at(11, 0), end: at(11, 0) }, false],
    [{ start: at(11, 0), end: at(10, 55) }, false],
  ])("TPK-07 %o ends after start: %s", (times, expected) => {
    expect(endsAfterStart(times)).toBe(expected);
  });

  it.each([
    [at(10, 30), 15, at(15, 30)],
    [at(10, 41), 0, at(0, 41)],
  ])("TPK-03 setting the hour of %i to %i keeps the minutes: %i", (minutes, hour, expected) => {
    expect(withHour(minutes, hour)).toBe(expected);
  });

  it.each([
    [at(10, 30), 45, at(10, 45)],
    [at(23, 41), 0, at(23, 0)],
  ])("TPK-03 setting the minutes of %i to %i keeps the hour: %i", (minutes, minute, expected) => {
    expect(withMinute(minutes, minute)).toBe(expected);
  });

  it.each([
    [at(10, 30), "PM", at(22, 30)],
    [at(12, 15), "AM", at(0, 15)],
    [at(0, 5), "PM", at(12, 5)],
    [at(22, 30), "PM", at(22, 30)],
    [at(9, 0), "AM", at(9, 0)],
  ] as const)(
    "TPK-03 switching %i to %s keeps the clock hour and minutes: %i",
    (minutes, meridiem, expected) => {
      expect(withMeridiem(minutes, meridiem)).toBe(expected);
    },
  );

  it.each([
    [at(11, 0), 90, at(12, 30)],
    [at(23, 0), 120, at(23, 55)],
  ])(
    "TPK-04 a length chip from start %i of %i minutes ends at %i, capped at 11:55 PM",
    (start, length, expected) => {
      expect(endForLength(start, length)).toBe(expected);
    },
  );

  it.each([
    ["12h", "AM", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]],
    ["12h", "PM", [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]],
    ["24h", undefined, Array.from({ length: 24 }, (_, hour) => hour)],
  ] as const)(
    "TPK-03 TPK-09 the %s hour grid for %s holds the hours %o",
    (clock, meridiem, expected) => {
      expect(pickerHours(clock, meridiem)).toEqual(expected);
    },
  );

  it("TPK-03 the minute grid steps by 5 from 00 to 55", () => {
    expect(pickerMinutes(5)).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
  });

  it("SET-10 the ambient minute grid steps by 15", () => {
    expect(pickerMinutes(15)).toEqual([0, 15, 30, 45]);
  });
});

describe("default times in a zone", () => {
  const LA = "America/Los_Angeles";
  const morning = new Date("2026-10-09T17:41:00Z");

  it("TPK-05 the next whole hour is read in the given zone", () => {
    expect(nextWholeHour(morning, LA)).toBe(11 * 60);
  });

  it("TPK-05 default times start at the next whole hour in the given zone", () => {
    expect(defaultTimes(morning, LA)).toEqual({ start: 11 * 60, end: 12 * 60 });
  });
});

describe("slot times", () => {
  it("TL-08 a free slot becomes New event minutes in the given zone", () => {
    const slot = { start: new Date("2026-10-09T18:15:00Z"), end: new Date("2026-10-09T19:00:00Z") };

    expect(slotTimes(slot, "America/Los_Angeles")).toEqual({ start: 11 * 60 + 15, end: 12 * 60 });
  });
});
