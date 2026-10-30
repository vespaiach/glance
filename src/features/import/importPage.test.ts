import {
  type ImportPageAction,
  type ImportPageState,
  type ImportReview,
  importPageReducer,
  initialImportPage,
} from "./importPage";

const REVIEW: ImportReview = {
  fileName: "riverside-u10-soccer-fall.ics",
  size: 12_288,
  range: { from: "Oct 31", to: "Dec 12" },
  rows: [
    { id: "1", date: "Sat, Oct 31", title: "U10 game", time: "9:00 AM", duplicate: false },
    { id: "2", date: "Tue, Nov 3", title: "Practice", time: "5:30 PM", duplicate: true },
  ],
  newCount: 1,
  duplicates: 1,
  matched: 0,
};

const run = (state: ImportPageState, ...actions: ImportPageAction[]) =>
  actions.reduce(importPageReducer, state);

const reviewing = run(initialImportPage(), { type: "reviewed", review: REVIEW });

describe("importPage", () => {
  it("IMP-03 the page opens on Source", () => {
    expect(initialImportPage()).toEqual({ step: "source" });
  });

  it("IMP-07 a review opens with Everyone picked", () => {
    expect(reviewing).toEqual({ step: "review", review: REVIEW, who: "everyone" });
  });

  it("IMP-07 Who is a single pick", () => {
    const state = run(reviewing, { type: "who", who: "mia" }, { type: "who", who: "leo" });

    expect(state).toMatchObject({ step: "review", who: "leo" });
  });

  it("IMP-08 review → importing → done keeps the pick and the duplicates and takes the matched count", () => {
    const state = run(
      reviewing,
      { type: "who", who: "mia" },
      { type: "importing" },
      { type: "imported", count: 1, range: REVIEW.range, matched: 1 },
    );

    expect(state).toEqual({
      step: "done",
      done: { count: 1, who: "mia", range: REVIEW.range, duplicates: 1, matched: 1 },
    });
  });

  it("IMP-08 nothing changes the pick or leaves while importing", () => {
    const importing = run(reviewing, { type: "importing" });

    expect(run(importing, { type: "who", who: "mia" }, { type: "back" }, { type: "source" })).toBe(
      importing,
    );
  });

  it("IMP-08 importing offline → Couldn’t import → Try again → the same review", () => {
    const failed = run(
      reviewing,
      { type: "who", who: "mia" },
      { type: "importing" },
      { type: "offline" },
    );

    expect(failed).toMatchObject({ step: "error", error: "offline" });
    expect(run(failed, { type: "retry" })).toEqual({ step: "review", review: REVIEW, who: "mia" });
  });

  it("IMP-07 Change → Source", () => {
    expect(run(reviewing, { type: "source" })).toEqual({ step: "source" });
  });

  it("IMP-04 Send from phone and Back to Source", () => {
    const phone = run(initialImportPage(), { type: "phone" });

    expect(phone).toEqual({ step: "phone" });
    expect(run(phone, { type: "back" })).toEqual({ step: "source" });
  });

  it("IMP-06 a bad file shows its error and Choose again goes to Source", () => {
    const bad = run(initialImportPage(), { type: "failed", error: "type" });

    expect(bad).toEqual({ step: "error", error: "type" });
    expect(run(bad, { type: "source" })).toEqual({ step: "source" });
    expect(run(initialImportPage(), { type: "failed", error: "empty" }, { type: "back" })).toEqual({
      step: "source",
    });
  });

  it("IMP-03 IMP-09 Back on Source and on Imported closes", () => {
    const done = run(
      reviewing,
      { type: "importing" },
      { type: "imported", count: 1, range: REVIEW.range, matched: 0 },
    );

    expect(run(initialImportPage(), { type: "back" })).toEqual({ step: "closed" });
    expect(run(done, { type: "back" })).toEqual({ step: "closed" });
  });

  it("IMP-08 imported and offline only apply while importing", () => {
    expect(run(reviewing, { type: "offline" })).toBe(reviewing);
    expect(run(reviewing, { type: "imported", count: 1, range: REVIEW.range, matched: 0 })).toBe(
      reviewing,
    );
  });
});
