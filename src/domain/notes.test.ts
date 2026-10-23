import { noteDetailsTilt, noteExpired, noteStamp, noteTilt, noteWaitingToPost } from "./notes";
import { deviceTimeZone } from "./zone";

const tz = deviceTimeZone();

const now = new Date(2026, 9, 9, 10, 41);
const iso = (d: number, h: number, m: number) => new Date(2026, 9, d, h, m).toISOString();

describe("notes", () => {
  it.each([
    [0, -2],
    [1, 1.5],
    [2, -1],
    [3, 2.5],
    [4, -2],
    [7, 2.5],
  ])("NOTE-04 a new note on a board of %i notes tilts %f°", (count, expected) => {
    expect(noteTilt(count)).toBe(expected);
  });

  it.each([
    [-2, -1.5],
    [2.5, 1.5],
    [-1, -1],
    [0, 0],
  ])("NOTE-10 Note details tilt a note of %f° by %f°", (rotation, expected) => {
    expect(noteDetailsTilt(rotation)).toBe(expected);
  });

  it.each([
    ["now", iso(9, 10, 41), { kind: "justNow" }],
    ["4 minutes ago", iso(9, 10, 37), { kind: "justNow" }],
    ["5 minutes ago", iso(9, 10, 36), { kind: "at", text: "10:36 AM" }],
    ["earlier today", iso(9, 8, 12), { kind: "at", text: "8:12 AM" }],
    ["yesterday", iso(8, 21, 0), { kind: "at", text: "Thu 9:00 PM" }],
    ["six days ago", iso(3, 18, 40), { kind: "at", text: "Sat 6:40 PM" }],
    ["seven days ago", iso(2, 9, 0), { kind: "at", text: "Oct 2" }],
  ] as const)("NOTE-04 a note posted %s is stamped %o", (_, createdAt, expected) => {
    expect(noteStamp(createdAt, now, "12h", tz)).toEqual(expected);
  });

  it("NOTE-04 a same-day stamp follows the 24-hour clock", () => {
    expect(noteStamp(iso(9, 8, 12), now, "24h", tz)).toEqual({ kind: "at", text: "08:12" });
  });

  it("NOTE-04 a weekday stamp follows the 24-hour clock", () => {
    expect(noteStamp(iso(6, 18, 40), now, "24h", tz)).toEqual({ kind: "at", text: "Tue 18:40" });
  });

  it.each([
    [1, iso(8, 10, 42), false],
    [1, iso(8, 10, 41), false],
    [1, iso(8, 10, 40), true],
    [7, iso(2, 10, 41), false],
    [7, iso(2, 10, 40), true],
    [30, new Date(2026, 8, 9, 10, 41).toISOString(), false],
    [30, new Date(2026, 8, 9, 10, 40).toISOString(), true],
  ])(
    "NOTE-08 with expiry on at %i days a note from %s is expired: %s",
    (days, createdAt, expected) => {
      expect(noteExpired({ createdAt }, { on: true, days }, now)).toBe(expected);
    },
  );

  it("NOTE-08 with expiry off a note never expires, whatever days it keeps", () => {
    expect(noteExpired({ createdAt: iso(1, 0, 0) }, { on: false, days: 1 }, now)).toBe(false);
  });

  it.each([
    [true, 0, true],
    [true, 3, false],
    [false, 0, false],
  ])("OFF-04 a note pending %s at version %s waits to post: %s", (pending, version, waiting) => {
    expect(noteWaitingToPost({ pending, version })).toBe(waiting);
  });
});

describe("note stamp in a zone", () => {
  it("LOC-06 a note from yesterday in the given zone shows the weekday and time", () => {
    const stamp = noteStamp(
      "2026-10-10T06:30:00Z",
      new Date("2026-10-10T16:00:00Z"),
      "12h",
      "America/Los_Angeles",
    );

    expect(stamp).toEqual({ kind: "at", text: "Fri 11:30 PM" });
  });

  it("LOC-06 a note from today shows its time in the given zone", () => {
    const stamp = noteStamp(
      "2026-10-10T15:00:00Z",
      new Date("2026-10-10T16:00:00Z"),
      "12h",
      "America/Los_Angeles",
    );

    expect(stamp).toEqual({ kind: "at", text: "8:00 AM" });
  });
});
