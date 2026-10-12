import { DEFAULT_SETTINGS } from "./defaults";
import { ambientSetFor, ambientSummary, idleDue, inAmbient } from "./idle";
import type { AccountSettings } from "./schemas";
import { deviceTimeZone, zonedInstant } from "./zone";

type Ambient = AccountSettings["ambient"];

const tz = deviceTimeZone();

const PACIFIC = "America/Los_Angeles";

const everyNight = DEFAULT_SETTINGS.ambient;

const split: Ambient = {
  mode: "split",
  all: { start: "18:00", end: "07:30" },
  wknd: { start: "21:00", end: "09:00" },
};

const at = (time: string) => new Date(`2026-10-09T${time}:00`);

const OCT_DAYS: Record<string, number> = { Thu: 8, Fri: 9, Sat: 10, Sun: 11, Mon: 12 };

function pacific(when: string): Date {
  const [day = "", time = ""] = when.split(" ");

  const [hours = 0, minutes = 0] = time.split(":").map(Number);

  return zonedInstant(
    PACIFIC,
    { year: 2026, month: 10, day: OCT_DAYS[day] ?? 0 },
    hours * 60 + minutes,
  );
}

describe("ambientSetFor", () => {
  it.each([0, 1, 2, 3, 4, 5, 6])("SET-10 every night uses the one set on weekday %s", (weekday) => {
    expect(ambientSetFor(everyNight, weekday)).toEqual(everyNight.all);
  });

  it.each([
    [0, "all"],
    [1, "all"],
    [2, "all"],
    [3, "all"],
    [4, "all"],
    [5, "wknd"],
    [6, "wknd"],
  ] as const)("SET-10 weekends differ: the night of weekday %s uses %s", (weekday, set) => {
    expect(ambientSetFor(split, weekday)).toEqual(split[set]);
  });

  it("AMB-05 Off has no set for any night", () => {
    expect(ambientSetFor({ ...split, mode: "off" }, 5)).toBeNull();
  });
});

describe("inAmbient", () => {
  it.each([
    ["17:59", false],
    ["18:00", true],
    ["23:59", true],
    ["00:00", true],
    ["07:29", true],
    ["07:30", false],
    ["10:41", false],
  ])("AMB-05 every night at %s is %s for 6:00 PM – 7:30 AM", (time, expected) => {
    expect(inAmbient(everyNight, at(time), tz)).toBe(expected);
  });

  it.each([
    ["Thu 20:00", true],
    ["Fri 07:00", true],
    ["Fri 19:00", false],
    ["Fri 21:00", true],
    ["Sat 08:59", true],
    ["Sat 09:00", false],
    ["Sat 20:00", false],
    ["Sun 08:30", true],
    ["Sun 18:00", true],
    ["Mon 07:29", true],
    ["Mon 08:00", false],
  ])("AMB-05 weekends differ at %s is %s (Fri & Sat 9:00 PM – 9:00 AM)", (when, expected) => {
    expect(inAmbient(split, pacific(when), PACIFIC)).toBe(expected);
  });

  const earlyWeekend: Ambient = {
    mode: "split",
    all: { start: "23:00", end: "05:00" },
    wknd: { start: "00:30", end: "06:00" },
  };

  it.each([
    ["Fri 00:15", true],
    ["Fri 05:30", false],
    ["Sat 00:15", false],
    ["Sat 00:30", true],
    ["Sat 05:59", true],
    ["Sun 00:45", true],
    ["Mon 00:15", true],
    ["Mon 05:30", false],
  ])("SET-10 noon cutoff at %s is %s (12:30 AM Saturday is Friday's night)", (when, expected) => {
    expect(inAmbient(earlyWeekend, pacific(when), PACIFIC)).toBe(expected);
  });

  it("SET-10 a span past noon runs on into the next day", () => {
    const long: Ambient = { ...everyNight, all: { start: "20:00", end: "14:00" } };

    expect(inAmbient(long, pacific("Sat 13:59"), PACIFIC)).toBe(true);
    expect(inAmbient(long, pacific("Sat 14:00"), PACIFIC)).toBe(false);
  });

  it("SET-10 a set with the same dim and wake time is Not set and never runs", () => {
    const notSet: Ambient = { ...everyNight, all: { start: "18:00", end: "18:00" } };

    expect(inAmbient(notSet, pacific("Fri 18:00"), PACIFIC)).toBe(false);
    expect(inAmbient(notSet, pacific("Fri 23:00"), PACIFIC)).toBe(false);
  });

  it("SET-10 a Not set Sun – Thu set leaves the Fri & Sat nights running", () => {
    const weekendsOnly: Ambient = { ...split, all: { start: "21:00", end: "21:00" } };

    expect(inAmbient(weekendsOnly, pacific("Thu 22:00"), PACIFIC)).toBe(false);
    expect(inAmbient(weekendsOnly, pacific("Fri 22:00"), PACIFIC)).toBe(true);
  });

  it("AMB-05 Off never runs", () => {
    expect(inAmbient({ ...everyNight, mode: "off" }, pacific("Fri 22:00"), PACIFIC)).toBe(false);
  });

  it("LOC-06 reads the time of day in the given zone", () => {
    const fridayNight = new Date("2026-10-10T06:30:00Z");

    expect(inAmbient(everyNight, fridayNight, PACIFIC)).toBe(true);
  });
});

describe("ambientSummary", () => {
  it("SET-06 every night gives the one range in the clock format", () => {
    expect(ambientSummary(everyNight, "12h")).toEqual({
      mode: "same",
      all: { start: "6:00 PM", end: "7:30 AM" },
    });
  });

  it("SET-06 weekends differ gives both ranges", () => {
    expect(ambientSummary(split, "24h")).toEqual({
      mode: "split",
      all: { start: "18:00", end: "07:30" },
      wknd: { start: "21:00", end: "09:00" },
    });
  });

  it("SET-06 a set with the same dim and wake time has no range (Not set)", () => {
    const weekendsOnly: Ambient = { ...split, all: { start: "21:00", end: "21:00" } };

    expect(ambientSummary(weekendsOnly, "12h")).toEqual({
      mode: "split",
      all: null,
      wknd: { start: "9:00 PM", end: "9:00 AM" },
    });
  });

  it("SET-06 Off has no ranges", () => {
    expect(ambientSummary({ ...split, mode: "off" }, "12h")).toEqual({ mode: "off" });
  });
});

describe("idleDue", () => {
  const last = at("10:00");

  it.each([
    [60, "10:00", false],
    [60, "10:01", true],
    [180, "10:02", false],
    [180, "10:03", true],
  ])("IDLE-01 timeout %ss is due at %s: %s", (timeout, time, expected) => {
    expect(idleDue(last, at(time), timeout as 60 | 180)).toBe(expected);
  });

  it("IDLE-01 Never is never due", () => {
    expect(idleDue(last, at("23:00"), null)).toBe(false);
  });
});
