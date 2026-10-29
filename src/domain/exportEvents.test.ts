import { allDayStart } from "./allDay";
import { exportableEvents, toIcs } from "./exportEvents";

const NY = "America/New_York";

const NOW = new Date("2026-10-29T16:00:00.000Z");

const BASE = { everyone: true, tagIds: [] };

const ENDED = {
  ...BASE,
  id: "ended",
  title: "Dentist",
  startAt: "2026-10-29T13:00:00.000Z",
  endAt: "2026-10-29T14:00:00.000Z",
};

const RUNNING = {
  ...BASE,
  id: "running",
  title: "Standup",
  startAt: "2026-10-29T15:30:00.000Z",
  endAt: "2026-10-29T16:30:00.000Z",
};

const LATER = {
  ...BASE,
  id: "later",
  title: "Dinner",
  startAt: "2026-10-30T23:00:00.000Z",
  endAt: "2026-10-31T00:30:00.000Z",
};

const LABELS = { forWho: (names: string) => `For: ${names}`, everyone: "Everyone" };

const PEOPLE = [
  { id: "mai", name: "Mai" },
  { id: "an", name: "An" },
];

describe("exportableEvents", () => {
  it("SET-18 an ended event is left out and a running one kept", () => {
    expect(exportableEvents([LATER, ENDED, RUNNING], NOW, NY).map((e) => e.id)).toEqual([
      "running",
      "later",
    ]);
  });

  it("SET-18 a weekly series with a later week is kept once", () => {
    const series = {
      ...ENDED,
      startAt: "2026-10-01T13:00:00.000Z",
      endAt: "2026-10-01T14:00:00.000Z",
      repeat: "weekly" as const,
    };

    expect(exportableEvents([series], NOW, NY)).toEqual([series]);
  });

  it("SET-18 today's all-day event is kept and yesterday's left out", () => {
    const today = {
      ...BASE,
      id: "today",
      title: "Trash",
      startAt: allDayStart("2026-10-29"),
      allDay: true as const,
    };
    const yesterday = { ...today, id: "yesterday", startAt: allDayStart("2026-10-28") };

    expect(exportableEvents([yesterday, today], NOW, NY).map((e) => e.id)).toEqual(["today"]);
  });
});

describe("toIcs", () => {
  it("SET-18 lines end in CRLF and wrap one VEVENT per event in a 2.0 calendar", () => {
    const ics = toIcs([RUNNING, LATER], PEOPLE, NOW, NY, LABELS);

    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replaceAll("\r\n", "")).not.toMatch(/[\r\n]/);
    expect(ics.split("\r\n").slice(0, 3)).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Glance//Calendar//EN",
    ]);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });

  it("SET-18 a timed event has its UID and floating local start and end", () => {
    const lines = toIcs([LATER], PEOPLE, NOW, NY, LABELS).split("\r\n");

    expect(lines).toContain("UID:later@glance.app");
    expect(lines).toContain("DTSTAMP:20261029T160000Z");
    expect(lines).toContain("DTSTART:20261030T190000");
    expect(lines).toContain("DTEND:20261030T203000");
    expect(lines).toContain("SUMMARY:Dinner");
  });

  it("SET-18 an event with no end time has no DTEND", () => {
    const { endAt: _, ...open } = LATER;

    expect(toIcs([open], PEOPLE, NOW, NY, LABELS)).not.toContain("DTEND");
  });

  it("SET-18 an all-day event is written as VALUE=DATE", () => {
    const allDay = {
      ...BASE,
      id: "trash",
      title: "Trash",
      startAt: allDayStart("2026-11-02"),
      allDay: true as const,
    };
    const lines = toIcs([allDay], PEOPLE, NOW, NY, LABELS).split("\r\n");

    expect(lines).toContain("DTSTART;VALUE=DATE:20261102");
    expect(lines.join("")).not.toContain("DTEND");
  });

  it("SET-18 a weekly series is one VEVENT with RRULE and an EXDATE per skipped week", () => {
    const series = { ...LATER, repeat: "weekly" as const, exdates: ["2026-11-06", "2026-11-13"] };
    const lines = toIcs([series], PEOPLE, NOW, NY, LABELS).split("\r\n");

    expect(lines.filter((line) => line === "BEGIN:VEVENT")).toHaveLength(1);
    expect(lines).toContain("RRULE:FREQ=WEEKLY");
    expect(lines).toContain("EXDATE:20261106T190000");
    expect(lines).toContain("EXDATE:20261113T190000");
  });

  it("SET-18 an all-day series skips weeks with VALUE=DATE", () => {
    const series = {
      ...BASE,
      id: "trash",
      title: "Trash",
      startAt: allDayStart("2026-11-02"),
      allDay: true as const,
      repeat: "weekly" as const,
      exdates: ["2026-11-09"],
    };

    expect(toIcs([series], PEOPLE, NOW, NY, LABELS).split("\r\n")).toContain(
      "EXDATE;VALUE=DATE:20261109",
    );
  });

  it("SET-18 commas, semicolons, backslashes and line breaks are escaped", () => {
    const event = {
      ...LATER,
      title: "Pick up, drop off; done\\",
      location: "Main St, 5",
      notes: "Bring\nsnacks",
    };
    const lines = toIcs([event], PEOPLE, NOW, NY, LABELS).split("\r\n");

    expect(lines).toContain("SUMMARY:Pick up\\, drop off\\; done\\\\");
    expect(lines).toContain("LOCATION:Main St\\, 5");
    expect(lines).toContain("DESCRIPTION:Bring\\nsnacks\\nFor: Everyone");
  });

  it("SET-18 the description names the people the event is for", () => {
    const event = { ...LATER, everyone: false, tagIds: ["mai", "an"] };

    expect(toIcs([event], PEOPLE, NOW, NY, LABELS).split("\r\n")).toContain(
      "DESCRIPTION:For: Mai\\, An",
    );
  });

  it("SET-18 a long line is folded at 75 octets", () => {
    const event = { ...LATER, title: "é".repeat(100) };
    const lines = toIcs([event], PEOPLE, NOW, NY, LABELS).split("\r\n");

    expect(lines.every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
    expect(lines.filter((line) => line.startsWith(" ")).length).toBeGreaterThan(0);
  });
});
