import type { Tag } from "./schemas";
import {
  type Dot,
  dayCounts,
  pickerMonthIndex,
  pickerMonths,
  readDateParam,
  stepWeek,
  weekDays,
  weekDots,
  weekHeading,
} from "./week";

const LA = "America/Los_Angeles";

const tag = (n: number, name: string, color: Tag["color"]): Tag => ({
  id: `0192f1a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
  name,
  color,
  createdAt: `2026-10-0${n}T15:00:00.000Z`,
});

const AN = tag(1, "Minh-An", "lilac");

const HY = tag(2, "Minh-Hy", "sky");

const MOM = tag(3, "Mom", "coral");

const FAMILY = [AN, HY, MOM];

const colors = (dots: Dot[] | undefined) => dots?.map((dot) => dot.color);

const plan = (startAt: string, who: Tag[] | "everyone", allDay?: true) => ({
  startAt,
  everyone: who === "everyone",
  tagIds: who === "everyone" ? [] : who.map((one) => one.id),
  ...(allDay && { allDay }),
});

describe("weekDays", () => {
  it("CAL-01 the week runs Sunday to Saturday around the selected day", () => {
    expect(weekDays("2026-10-09")).toEqual([
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
    ]);
  });

  it("CAL-01 a Sunday starts its own week and a week can cross months", () => {
    expect(weekDays("2026-09-27")[0]).toBe("2026-09-27");
    expect(weekDays("2026-10-01")).toEqual([
      "2026-09-27",
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
    ]);
  });
});

describe("stepWeek", () => {
  const TODAY = "2026-10-09";

  it.each([
    ["2026-10-09", 1, "2026-10-11"],
    ["2026-10-09", -1, "2026-09-27"],
    ["2026-12-31", 1, "2027-01-03"],
  ] as const)("CAL-02 stepping from %s by %i selects that week's Sunday, %s", (day, delta, to) => {
    expect(stepWeek(day, delta, TODAY)).toBe(to);
  });

  it.each([
    ["2026-10-14", -1],
    ["2026-09-30", 1],
  ] as const)("CAL-02 stepping from %s by %i onto this week selects today", (day, delta) => {
    expect(stepWeek(day, delta, TODAY)).toBe(TODAY);
  });
});

describe("weekHeading", () => {
  const TODAY = "2026-10-09";

  it("CAL-01 the range runs Sunday to Saturday under one month name when the week fits a month", () => {
    expect(weekHeading("2026-10-09", TODAY)).toEqual({
      from: "Oct 4",
      to: "10",
      year: undefined,
      month: "October",
    });
  });

  it("CAL-01 a week across months names both months and takes the month of its Saturday", () => {
    expect(weekHeading("2026-10-01", TODAY)).toEqual({
      from: "Sep 27",
      to: "Oct 3",
      year: undefined,
      month: "October",
    });
  });

  it("CAL-01 a week ending outside the current year adds its Saturday's year", () => {
    expect(weekHeading("2026-12-31", TODAY)).toEqual({
      from: "Dec 27",
      to: "Jan 2",
      year: "2027",
      month: "January",
    });
    expect(weekHeading("2025-03-12", TODAY)).toMatchObject({
      from: "Mar 9",
      to: "15",
      year: "2025",
    });
  });
});

describe("dayCounts", () => {
  it("CAL-01 counts every plan on its day, whoever it is for", () => {
    const counts = dayCounts(
      [
        plan("2026-10-09T17:00:00Z", [MOM]),
        plan("2026-10-09T20:00:00Z", "everyone"),
        plan("2026-10-09T21:00:00Z", []),
        plan("2026-10-10T06:30:00Z", [HY]),
        plan("2026-10-16T00:00:00.000Z", [AN], true),
      ],
      LA,
    );

    expect(counts.get("2026-10-09")).toBe(4);
    expect(counts.get("2026-10-16")).toBe(1);
    expect(counts.get("2026-10-10")).toBeUndefined();
  });
});

describe("weekDots", () => {
  it("CAL-01 each day lists the tags with a plan that day, in family order", () => {
    const dots = weekDots(
      [plan("2026-10-09T17:00:00Z", [MOM]), plan("2026-10-09T20:00:00Z", [MOM, AN])],
      FAMILY,
      LA,
    );

    expect(colors(dots.get("2026-10-09"))).toEqual(["lilac", "coral"]);
    expect(dots.get("2026-10-10")).toBeUndefined();
  });

  it("CAL-01 an everyone plan gives every tag a dot", () => {
    const dots = weekDots([plan("2026-10-09T17:00:00Z", "everyone")], FAMILY, LA);

    expect(colors(dots.get("2026-10-09"))).toEqual(["lilac", "sky", "coral"]);
  });

  it("CAL-01 a day shows at most 3 dots", () => {
    const more = [...FAMILY, tag(4, "Dad", "mint")];

    const dots = weekDots([plan("2026-10-09T17:00:00Z", "everyone")], more, LA);

    expect(colors(dots.get("2026-10-09"))).toEqual(["lilac", "sky", "coral"]);
  });

  it("LOC-06 a timed plan counts on its day in the zone and an all-day plan on its date", () => {
    const dots = weekDots(
      [plan("2026-10-10T06:30:00Z", [HY]), plan("2026-10-16T00:00:00.000Z", [AN], true)],
      FAMILY,
      LA,
    );

    expect(colors(dots.get("2026-10-09"))).toEqual(["sky"]);
    expect(colors(dots.get("2026-10-16"))).toEqual(["lilac"]);
  });
});

describe("readDateParam", () => {
  it.each(["2026-10-14", "2028-02-29"])("CAL-04 ?date=%s selects that day", (value) => {
    expect(readDateParam(value)).toBe(value);
  });

  it.each([null, "", "2026-1-4", "2026-02-30", "2026-13-01", "tomorrow", "2026-10-14T10:00"])(
    "CAL-04 ?date=%s is ignored",
    (value) => {
      expect(readDateParam(value)).toBeUndefined();
    },
  );
});

describe("pickerMonths", () => {
  it("CAL-03 runs from January of this year to December of next year", () => {
    const months = pickerMonths("2026-10-09");

    expect(months).toHaveLength(24);
    expect(months[0]?.label).toBe("January 2026");
    expect(months[0]?.key).toBe("2026-01");
    expect(months[0]?.days[0]).toBe("2026-01-01");
    expect(months[1]?.days).toHaveLength(28);
    expect(months.at(-1)?.label).toBe("December 2027");
    expect(months.at(-1)?.days.at(-1)).toBe("2027-12-31");
  });

  it("CAL-03 each month knows the weekday of its 1st", () => {
    const months = pickerMonths("2026-10-09");

    expect(months[9]?.leading).toBe(4);
    expect(months[1]?.leading).toBe(0);
  });
});

describe("pickerMonthIndex", () => {
  const months = pickerMonths("2026-10-09");

  it("CAL-03 opens on the selected day's month", () => {
    expect(months[pickerMonthIndex(months, "2026-10-14")]?.key).toBe("2026-10");
    expect(months[pickerMonthIndex(months, "2027-02-01")]?.key).toBe("2027-02");
  });

  it("CAL-03 a day outside the range opens on the nearest end", () => {
    expect(pickerMonthIndex(months, "2025-12-31")).toBe(0);
    expect(pickerMonthIndex(months, "2028-01-01")).toBe(23);
  });
});
