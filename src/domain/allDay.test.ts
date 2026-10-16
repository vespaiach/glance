import { allDayStart, eventDayKey } from "./allDay";

const ZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "Pacific/Honolulu",
  "Pacific/Guam",
  "Pacific/Kiritimati",
  "Pacific/Pago_Pago",
];

describe("allDayStart", () => {
  it("D21 an all-day event starts at its date's UTC midnight", () => {
    expect(allDayStart("2026-10-16")).toBe("2026-10-16T00:00:00.000Z");
  });
});

describe("eventDayKey", () => {
  it.each(["2026-10-16", "2026-03-08", "2026-11-01", "2026-12-31", "2027-01-01"])(
    "D21 an all-day event on %s keeps its date in every zone",
    (key) => {
      const event = { startAt: allDayStart(key), allDay: true as const };

      expect(ZONES.map((tz) => eventDayKey(event, tz))).toEqual(ZONES.map(() => key));
    },
  );

  it.each([
    ["America/Los_Angeles", "2026-10-15"],
    ["UTC", "2026-10-16"],
    ["Pacific/Guam", "2026-10-16"],
  ])("LOC-06 a timed event at the same instant falls on its day in %s", (tz, key) => {
    expect(eventDayKey({ startAt: "2026-10-16T00:00:00.000Z" }, tz)).toBe(key);
  });
});
