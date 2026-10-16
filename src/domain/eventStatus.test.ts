import { eventStatus } from "./eventStatus";
import { deviceTimeZone } from "./zone";

const tz = deviceTimeZone();

const now = new Date(2026, 9, 9, 10, 41);
const iso = (d: number, h: number, m: number) => new Date(2026, 9, d, h, m).toISOString();

describe("eventStatus", () => {
  it.each([
    ["ended before now", iso(9, 9, 0), iso(9, 9, 30), "past"],
    ["ending exactly now", iso(9, 10, 0), iso(9, 10, 41), "past"],
    ["running", iso(9, 10, 30), iso(9, 11, 15), "now"],
    ["starting exactly now", iso(9, 10, 41), iso(9, 11, 0), "now"],
    ["later today", iso(9, 12, 0), iso(9, 13, 0), "upcoming"],
    ["started today with no end", iso(9, 9, 0), undefined, "now"],
    ["later today with no end", iso(9, 15, 0), undefined, "upcoming"],
    ["on an earlier day", iso(2, 19, 0), iso(2, 21, 0), "past"],
    ["on an earlier day with no end", iso(8, 9, 0), undefined, "past"],
    ["on a later day", iso(14, 16, 0), iso(14, 16, 30), "upcoming"],
  ] as const)("STATUS-01 an event %s is %s", (_, startAt, endAt, expected) => {
    expect(eventStatus({ startAt, endAt }, now, tz)).toBe(expected);
  });
});

describe("eventStatus in a zone", () => {
  it("LOC-06 an event on the day before in the given zone is past", () => {
    const event = { startAt: "2026-10-10T06:30:00Z" };

    expect(eventStatus(event, new Date("2026-10-10T16:00:00Z"), "America/Los_Angeles")).toBe(
      "past",
    );
  });
});

describe("eventStatus of an all-day event", () => {
  it.each([
    ["today", "2026-10-09T00:00:00.000Z"],
    ["on an earlier day", "2026-10-02T00:00:00.000Z"],
    ["on a later day", "2026-10-16T00:00:00.000Z"],
  ])("STATUS-01 an all-day event %s has no status", (_, startAt) => {
    expect(eventStatus({ startAt, allDay: true }, now, tz)).toBe("allDay");
  });

  it.each(["America/Los_Angeles", "Pacific/Guam"])(
    "STATUS-01 an all-day event today is never past or now in %s",
    (zone) => {
      const event = { startAt: "2026-10-09T00:00:00.000Z", allDay: true as const };

      expect(eventStatus(event, new Date("2026-10-09T12:00:00Z"), zone)).toBe("allDay");
    },
  );
});
