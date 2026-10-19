import type { Member } from "./schemas";
import {
  type Dot,
  pickerMonths,
  readDateParam,
  stepWeek,
  weekDays,
  weekDots,
  weekHeading,
} from "./week";

const LA = "America/Los_Angeles";

const member = (n: number, name: string, color: Member["color"]): Member => ({
  id: `0192f1a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
  name,
  color,
  createdAt: `2026-10-0${n}T15:00:00.000Z`,
});

const AN = member(1, "Minh-An", "lilac");

const HY = member(2, "Minh-Hy", "sky");

const MOM = member(3, "Mom", "coral");

const FAMILY = [AN, HY, MOM];

const colors = (dots: Dot[] | undefined) => dots?.map((dot) => dot.color);

const plan = (startAt: string, who: Member[] | "everyone", allDay?: true) => ({
  startAt,
  everyone: who === "everyone",
  memberIds: who === "everyone" ? [] : who.map((one) => one.id),
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
  it("CAL-01 a week in one month reads 'Oct 4 – 10' and the month name", () => {
    expect(weekHeading("2026-10-09", "2026-10-09")).toEqual({
      range: "Oct 4 – 10",
      month: "October",
    });
  });

  it("CAL-01 a week across months names both and the month of its Saturday", () => {
    expect(weekHeading("2026-10-01", "2026-10-09")).toEqual({
      range: "Sep 27 – Oct 3",
      month: "October",
    });
  });

  it("CAL-01 the month adds the year outside the current year", () => {
    expect(weekHeading("2027-01-05", "2026-10-09").month).toBe("January 2027");
  });
});

describe("weekDots", () => {
  it("CAL-01 each day lists the members with a plan that day, in family order", () => {
    const dots = weekDots(
      [plan("2026-10-09T17:00:00Z", [MOM]), plan("2026-10-09T20:00:00Z", [MOM, AN])],
      FAMILY,
      LA,
    );

    expect(colors(dots.get("2026-10-09"))).toEqual(["lilac", "coral"]);
    expect(dots.get("2026-10-10")).toBeUndefined();
  });

  it("CAL-01 an everyone plan gives every member a dot", () => {
    const dots = weekDots([plan("2026-10-09T17:00:00Z", "everyone")], FAMILY, LA);

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
  it("CAL-03 runs from 2 months before to 3 months after today's month", () => {
    const months = pickerMonths("2026-10-09");

    expect(months.map((month) => month.label)).toEqual([
      "August 2026",
      "September 2026",
      "October 2026",
      "November 2026",
      "December 2026",
      "January 2027",
    ]);
    expect(months[0]?.days[0]).toBe("2026-08-01");
    expect(months[1]?.days).toHaveLength(30);
    expect(months[5]?.days.at(-1)).toBe("2027-01-31");
  });

  it("CAL-03 crosses back into last year", () => {
    const months = pickerMonths("2027-01-20");

    expect(months[0]?.label).toBe("November 2026");
    expect(months[0]?.key).toBe("2026-11");
    expect(months[3]?.days).toHaveLength(28);
  });
});
