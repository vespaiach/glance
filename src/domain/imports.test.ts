import { allDayStart } from "./allDay";
import { markDuplicates } from "./imports";

const NY = "America/New_York";

const SWIM = {
  title: "Swim",
  startAt: "2026-10-09T20:00:00.000Z",
  endAt: "2026-10-09T21:00:00.000Z",
};

const SWIM_SERIES = { ...SWIM, repeat: "weekly" as const, exdates: ["2026-10-23"] };

type Plan = Parameters<typeof markDuplicates>[1][number];

function duplicates(events: Plan[], calendar: Plan[] = []): boolean[] {
  return markDuplicates(events, calendar, NY).map((event) => event.duplicate);
}

describe("markDuplicates", () => {
  it("IMP-07 an event with the same title ignoring case, start and end is a duplicate", () => {
    expect(duplicates([{ ...SWIM, title: "SWIM" }], [SWIM])).toEqual([true]);
  });

  it("IMP-07 another start, end, title or all-day isn't a duplicate", () => {
    const events = [
      { ...SWIM, startAt: "2026-10-09T19:00:00.000Z" },
      { ...SWIM, endAt: "2026-10-09T22:00:00.000Z" },
      { ...SWIM, title: "Swim lesson" },
    ];

    expect(duplicates(events, [SWIM])).toEqual([false, false, false]);
    expect(
      duplicates(
        [{ title: "Swim", startAt: allDayStart("2026-10-09") }],
        [{ title: "Swim", startAt: allDayStart("2026-10-09"), allDay: true }],
      ),
    ).toEqual([false]);
  });

  it("IMP-07 a week of a series on the calendar is a duplicate and a skipped week isn't", () => {
    const events = [
      { ...SWIM, startAt: "2026-10-16T20:00:00.000Z", endAt: "2026-10-16T21:00:00.000Z" },
      { ...SWIM, startAt: "2026-10-23T20:00:00.000Z", endAt: "2026-10-23T21:00:00.000Z" },
      { ...SWIM, startAt: "2026-11-06T21:00:00.000Z", endAt: "2026-11-06T22:00:00.000Z" },
    ];

    expect(duplicates(events, [SWIM_SERIES])).toEqual([true, false, true]);
  });

  it("IMP-07 a repeat within the file marks only the later one", () => {
    expect(duplicates([SWIM, { ...SWIM, title: "swim" }])).toEqual([false, true]);
  });
});
