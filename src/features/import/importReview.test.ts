import type { LastImport as ServerLast, ImportReview as ServerReview } from "@/domain/imports";
import { lastShown, rangeShown, reviewShown } from "./importReview";

const TZ = "America/Los_Angeles";

const REVIEW: ServerReview = {
  id: "imp-1",
  fileName: "soccer.ics",
  size: 12_288,
  range: { first: "2026-10-31", last: "2026-12-12" },
  events: [
    {
      title: "U10 game",
      startAt: "2026-10-31T16:00:00.000Z",
      endAt: "2026-10-31T17:00:00.000Z",
      duplicate: false,
    },
    { title: "Picture day", startAt: "2026-11-21T08:00:00.000Z", allDay: true, duplicate: true },
    {
      title: "Swim",
      startAt: "2026-11-24T00:00:00.000Z",
      endAt: "2026-11-24T01:00:00.000Z",
      repeat: "weekly",
      duplicate: false,
    },
  ],
  newCount: 2,
  duplicates: 1,
  matched: 0,
};

const LAST: ServerLast = {
  id: "imp-1",
  importedAt: "2026-10-29T17:00:00.000Z",
  count: 16,
  who: "mia",
  undoUntil: "2026-10-30T17:00:00.000Z",
};

test("IMP-07 a review reads each event's day and time, all day and weekly, in the location's zone", () => {
  const shown = reviewShown(REVIEW, TZ, "12h");

  expect(shown.rows).toEqual([
    { id: "0", date: "Sat, Oct 31", title: "U10 game", time: "9:00 AM", duplicate: false },
    { id: "1", date: "Sat, Nov 21", title: "Picture day", duplicate: true },
    {
      id: "2",
      date: "Mon, Nov 23",
      title: "Swim",
      time: "4:00 PM",
      weekly: true,
      duplicate: false,
    },
  ]);
  expect(shown).toMatchObject({ fileName: "soccer.ics", size: 12_288, newCount: 2, duplicates: 1 });
});

test("IMP-07 a review carries the matched count", () => {
  expect(reviewShown({ ...REVIEW, matched: 1 }, TZ, "12h").matched).toBe(1);
});

test("IMP-07 the range reads its first and last days as month days", () => {
  expect(rangeShown(REVIEW.range, TZ)).toEqual({ from: "Oct 31", to: "Dec 12" });
});

test("IMP-10 the last import reads its day and offers Undo until undoUntil", () => {
  expect(lastShown(LAST, new Date("2026-10-30T16:59:00.000Z"), TZ)).toEqual({
    date: "Oct 29",
    count: 16,
    who: "mia",
    canUndo: true,
  });
  expect(lastShown(LAST, new Date("2026-10-30T17:00:00.000Z"), TZ).canUndo).toBe(false);
});
