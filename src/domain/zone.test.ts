import {
  addDays,
  dateKey,
  dayNumber,
  dayStart,
  displayTimeZone,
  parseDateKey,
  wallTime,
  zonedInstant,
} from "./zone";

const LA = "America/Los_Angeles";
const NY = "America/New_York";
const BERLIN = "Europe/Berlin";
const KOLKATA = "Asia/Kolkata";

const at = (h: number, m: number) => h * 60 + m;

describe("zone", () => {
  it("D15 wallTime reads an instant's wall clock in the given zone", () => {
    expect(wallTime(new Date("2026-10-09T17:41:00Z"), LA)).toEqual({
      year: 2026,
      month: 10,
      day: 9,
      hour: 10,
      minute: 41,
      weekday: 5,
    });
  });

  it("D15 wallTime of the same instant differs by zone", () => {
    const instant = new Date("2026-10-10T03:30:00Z");

    expect(wallTime(instant, LA)).toMatchObject({ day: 9, hour: 20, minute: 30, weekday: 5 });
    expect(wallTime(instant, KOLKATA)).toMatchObject({ day: 10, hour: 9, minute: 0, weekday: 6 });
  });

  it("D15 wallTime reads midnight as hour 0", () => {
    expect(wallTime(new Date("2026-10-09T07:00:00Z"), LA)).toMatchObject({ day: 9, hour: 0 });
  });

  it.each([
    [LA, { year: 2026, month: 10, day: 9 }, at(10, 41), "2026-10-09T17:41:00.000Z"],
    [NY, { year: 2026, month: 1, day: 15 }, at(0, 0), "2026-01-15T05:00:00.000Z"],
    [KOLKATA, { year: 2026, month: 10, day: 9 }, at(23, 55), "2026-10-09T18:25:00.000Z"],
  ] as const)("D15 zonedInstant in %s of %o at minute %i is %s", (tz, date, minutes, iso) => {
    expect(zonedInstant(tz, date, minutes).toISOString()).toBe(iso);
  });

  it.each([
    [LA, { year: 2026, month: 3, day: 8 }, "2026-03-08T10:30:00.000Z"],
    [NY, { year: 2026, month: 3, day: 8 }, "2026-03-08T07:30:00.000Z"],
    [BERLIN, { year: 2026, month: 3, day: 29 }, "2026-03-29T01:30:00.000Z"],
  ] as const)(
    "LOC-06 a 2:30 AM skipped in %s moves forward by the gap to 3:30 AM",
    (tz, date, iso) => {
      const instant = zonedInstant(tz, date, at(2, 30));

      expect(instant.toISOString()).toBe(iso);
      expect(wallTime(instant, tz)).toMatchObject({ hour: 3, minute: 30 });
    },
  );

  it.each([
    [LA, { year: 2026, month: 11, day: 1 }, at(1, 30), "2026-11-01T08:30:00.000Z"],
    [NY, { year: 2026, month: 11, day: 1 }, at(1, 30), "2026-11-01T05:30:00.000Z"],
    [BERLIN, { year: 2026, month: 10, day: 25 }, at(2, 30), "2026-10-25T00:30:00.000Z"],
  ] as const)(
    "LOC-06 a repeated wall time in %s is the first of the two",
    (tz, date, minutes, iso) => {
      expect(zonedInstant(tz, date, minutes).toISOString()).toBe(iso);
    },
  );

  it("LOC-06 the minutes after a skipped hour keep their wall time", () => {
    expect(zonedInstant(LA, { year: 2026, month: 3, day: 8 }, at(3, 0)).toISOString()).toBe(
      "2026-03-08T10:00:00.000Z",
    );
  });

  it("D15 zonedInstant reads 24:00 as the next midnight", () => {
    expect(zonedInstant(LA, { year: 2026, month: 10, day: 9 }, at(24, 0)).toISOString()).toBe(
      "2026-10-10T07:00:00.000Z",
    );
  });

  it("D15 dayNumber counts days since 1970-01-01 of the zone's date", () => {
    const instant = new Date("2026-10-10T03:30:00Z");

    expect(dayNumber(instant, LA)).toBe(Date.UTC(2026, 9, 9) / 86_400_000);
    expect(dayNumber(instant, KOLKATA)).toBe(Date.UTC(2026, 9, 10) / 86_400_000);
  });

  it("D15 dayNumber steps by one across a DST change", () => {
    const before = dayNumber(new Date("2026-03-08T08:00:00Z"), LA);
    const after = dayNumber(new Date("2026-03-09T07:00:00Z"), LA);

    expect(after - before).toBe(1);
  });

  it("D15 dateKey names the zone's date", () => {
    const instant = new Date("2026-10-10T03:30:00Z");

    expect(dateKey(instant, LA)).toBe("2026-10-09");
    expect(dateKey(instant, KOLKATA)).toBe("2026-10-10");
  });

  it("D15 parseDateKey gives the date's UTC midnight", () => {
    expect(parseDateKey("2026-10-09").toISOString()).toBe("2026-10-09T00:00:00.000Z");
  });

  it.each([
    ["2026-10-09", 1, "2026-10-10"],
    ["2026-10-31", 1, "2026-11-01"],
    ["2026-03-01", -1, "2026-02-28"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2026-03-07", 2, "2026-03-09"],
  ] as const)("D15 addDays(%s, %i) is %s", (key, n, expected) => {
    expect(addDays(key, n)).toBe(expected);
  });

  it.each([
    [LA, "2026-10-09", "2026-10-09T07:00:00.000Z"],
    [LA, "2026-03-08", "2026-03-08T08:00:00.000Z"],
    [LA, "2026-03-09", "2026-03-09T07:00:00.000Z"],
    [NY, "2026-11-01", "2026-11-01T04:00:00.000Z"],
    [NY, "2026-11-02", "2026-11-02T05:00:00.000Z"],
  ] as const)("D15 dayStart in %s of %s is %s", (tz, key, iso) => {
    expect(dayStart(key, tz).toISOString()).toBe(iso);
  });

  it("LOC-06 the display zone is the location's", () => {
    expect(displayTimeZone({ weatherLocation: { timeZone: LA } }, NY)).toBe(LA);
  });

  it("LOC-06 the display zone falls back to the device's without a located zone", () => {
    expect(displayTimeZone({}, NY)).toBe(NY);
    expect(displayTimeZone({ weatherLocation: {} }, NY)).toBe(NY);
  });
});
