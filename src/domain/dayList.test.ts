import { type DayListRow, dayListGroups } from "./dayList";
import { zonedInstant } from "./zone";

const tz = "America/Los_Angeles";

const OCT_9 = "2026-10-09";

const OCT_10 = "2026-10-10";

const october = (day: number, minutes: number) =>
  zonedInstant(tz, { year: 2026, month: 10, day }, minutes);

const NOW = october(9, 10 * 60 + 41);

const plan = (id: string, day: number, start: number, end?: number) => ({
  id,
  startAt: october(day, start).toISOString(),
  ...(end === undefined ? {} : { endAt: october(day, end).toISOString() }),
});

const TODAY_PLANS = [
  plan("lunch", 9, 720, 780),
  plan("drop-off", 9, 465, 495),
  plan("piano", 9, 1020, 1065),
  plan("call", 9, 630, 675),
];

const names = (rows: readonly DayListRow<{ id: string }>[]) =>
  rows.map((row) => (row.kind === "plan" ? row.plan.id : `free ${row.start}-${row.end}`));

const today = { day: OCT_9, now: NOW, tz };

const tomorrow = { day: OCT_10, now: NOW, tz };

describe("dayListGroups", () => {
  it("CAL-10 on today ended plans are earlier, running ones happening now and the rest later", () => {
    const groups = dayListGroups(TODAY_PLANS, today, true);

    if (groups.kind !== "today") throw new Error("expected today's groups");
    expect(names(groups.earlier)).toEqual(["drop-off"]);
    expect(names(groups.now)).toEqual(["call"]);
    expect(groups.laterCount).toBe(2);
  });

  it("CAL-10 later today holds the plans ahead and the free gaps after now, in start order", () => {
    const groups = dayListGroups(TODAY_PLANS, today, true);

    if (groups.kind !== "today") throw new Error("expected today's groups");
    expect(names(groups.later)).toEqual([
      "free 675-720",
      "lunch",
      "free 780-1020",
      "piano",
      "free 1065-1260",
    ]);
  });

  it("CAL-10 another day is one group of every plan and its free gaps in start order", () => {
    const groups = dayListGroups(
      [plan("swim", 10, 840, 900), plan("soccer", 10, 540, 600)],
      tomorrow,
      true,
    );

    expect(groups.kind).toBe("day");
    if (groups.kind !== "day") return;
    expect(groups.count).toBe(2);
    expect(names(groups.rows)).toEqual([
      "free 300-540",
      "soccer",
      "free 600-840",
      "swim",
      "free 900-1260",
    ]);
  });

  it("CAL-10 an empty day is one free row from 5 AM to 9 PM that adds a one-hour event", () => {
    const groups = dayListGroups([], tomorrow, true);

    if (groups.kind !== "day") throw new Error("expected one day group");
    expect(groups.count).toBe(0);
    expect(groups.rows).toEqual([
      { kind: "free", start: 300, end: 1260, newEvent: { start: 300, end: 360 } },
    ]);
  });

  it("CAL-10 without free time to show there are no free rows", () => {
    const groups = dayListGroups(TODAY_PLANS, today, false);

    if (groups.kind !== "today") throw new Error("expected today's groups");
    expect(names(groups.later)).toEqual(["lunch", "piano"]);
  });

  it("CAL-10 all-day events stay out of the groups", () => {
    const groups = dayListGroups(
      [{ ...plan("holiday", 10, 0), allDay: true as const }, plan("soccer", 10, 540, 600)],
      tomorrow,
      false,
    );

    if (groups.kind !== "day") throw new Error("expected one day group");
    expect(names(groups.rows)).toEqual(["soccer"]);
    expect(groups.count).toBe(1);
  });

  it("CAL-10 a plan row carries its start, its end (none when open) and its status", () => {
    const groups = dayListGroups([plan("pickup", 9, 900)], today, false);

    if (groups.kind !== "today") throw new Error("expected today's groups");
    expect(groups.later).toEqual([
      {
        kind: "plan",
        plan: plan("pickup", 9, 900),
        start: 900,
        end: undefined,
        status: "upcoming",
      },
    ]);
  });
});
