import { defaultEnd, defaultTimes, endsAfterStart, moveStart, nextHalfHour } from "./eventTimes";

const at = (h: number, m: number) => h * 60 + m;
const today = (h: number, m: number) => new Date(2026, 9, 9, h, m);

describe("eventTimes", () => {
  it.each([
    [today(10, 41), at(11, 0)],
    [today(11, 0), at(11, 30)],
    [today(11, 29), at(11, 30)],
    [today(0, 0), at(0, 30)],
    [today(23, 0), at(23, 30)],
    [today(23, 30), at(23, 30)],
    [today(23, 59), at(23, 30)],
  ])("TPK-05 next half hour after %s is minute %i, capped at 11:30 PM", (now, expected) => {
    expect(nextHalfHour(now)).toBe(expected);
  });

  it.each([
    [today(10, 41), { start: at(11, 0), end: at(12, 0) }],
    [today(23, 10), { start: at(23, 30), end: at(23, 55) }],
    [today(23, 45), { start: at(23, 30), end: at(23, 55) }],
  ])("TPK-05 a new event at %s defaults to %o", (now, expected) => {
    expect(defaultTimes(now)).toEqual(expected);
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
});
