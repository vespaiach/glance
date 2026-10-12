import { noteExpired, noteStamp, noteTilt, noteWaitingToPost } from "./notes";

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
    ["now", iso(9, 10, 41), { kind: "justNow" }],
    ["4 minutes ago", iso(9, 10, 37), { kind: "justNow" }],
    ["5 minutes ago", iso(9, 10, 36), { kind: "at", text: "10:36 AM" }],
    ["earlier today", iso(9, 8, 12), { kind: "at", text: "8:12 AM" }],
    ["yesterday", iso(8, 21, 0), { kind: "at", text: "Thu" }],
    ["six days ago", iso(3, 9, 0), { kind: "at", text: "Sat" }],
    ["seven days ago", iso(2, 9, 0), { kind: "at", text: "Oct 2" }],
  ] as const)("NOTE-04 a note posted %s is stamped %o", (_, createdAt, expected) => {
    expect(noteStamp(createdAt, now, "12h")).toEqual(expected);
  });

  it("NOTE-04 a same-day stamp follows the 24-hour clock", () => {
    expect(noteStamp(iso(9, 8, 12), now, "24h")).toEqual({ kind: "at", text: "08:12" });
  });

  it.each([
    ["1d", iso(8, 10, 42), false],
    ["1d", iso(8, 10, 41), false],
    ["1d", iso(8, 10, 40), true],
    ["1w", iso(3, 10, 41), false],
    ["1w", iso(2, 10, 40), true],
    [null, iso(1, 0, 0), false],
  ] as const)(
    "NOTE-08 with expiry %s a note from %s is expired: %s",
    (expiry, createdAt, expected) => {
      expect(noteExpired({ createdAt }, expiry, now)).toBe(expected);
    },
  );

  it.each([
    [true, 0, true],
    [true, 3, false],
    [false, 0, false],
  ])("OFF-04 a note pending %s at version %s waits to post: %s", (pending, version, waiting) => {
    expect(noteWaitingToPost({ pending, version })).toBe(waiting);
  });
});
