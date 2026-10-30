import { readFileSync } from "node:fs";
import path from "node:path";
import { parseIcs } from "./parse";

const NOW = new Date("2026-10-29T14:00:00.000Z");

const TZ = "America/New_York";

function fixture(name: string): string {
  return readFileSync(path.join(import.meta.dirname, "fixtures", name), "utf8");
}

function calendar(...events: string[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Glance//Test//EN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

function vevent(uid: string, lines: string[]): string {
  return ["BEGIN:VEVENT", `UID:${uid}`, "DTSTAMP:20260901T000000Z", ...lines, "END:VEVENT"].join(
    "\r\n",
  );
}

function parsedEvents(text: string) {
  const result = parseIcs(text, NOW, TZ);

  if (!result.ok) throw new Error(result.error);

  return result.value.events;
}

describe("parseIcs", () => {
  it("IMP-05 a weekly no-end rule becomes one series with its EXDATEs", () => {
    expect(parsedEvents(fixture("weekly.ics"))).toEqual([
      {
        title: "Soccer practice",
        startAt: "2026-09-08T21:00:00.000Z",
        endAt: "2026-09-08T22:00:00.000Z",
        location: "Riverside field",
        repeat: "weekly",
        exdates: ["2026-11-10", "2026-11-24"],
      },
    ]);
  });

  it("IMP-05 a changed week of a weekly series is skipped by the series and added on its own", () => {
    const text = calendar(
      vevent("piano", [
        "DTSTART;TZID=America/New_York:20261103T170000",
        "DTEND;TZID=America/New_York:20261103T173000",
        "RRULE:FREQ=WEEKLY",
        "SUMMARY:Piano",
      ]),
      vevent("piano", [
        "RECURRENCE-ID;TZID=America/New_York:20261110T170000",
        "DTSTART;TZID=America/New_York:20261111T170000",
        "DTEND;TZID=America/New_York:20261111T173000",
        "SUMMARY:Piano (Wednesday)",
      ]),
    );

    expect(parsedEvents(text)).toEqual([
      {
        title: "Piano",
        startAt: "2026-11-03T22:00:00.000Z",
        endAt: "2026-11-03T22:30:00.000Z",
        repeat: "weekly",
        exdates: ["2026-11-10"],
      },
      {
        title: "Piano (Wednesday)",
        startAt: "2026-11-11T22:00:00.000Z",
        endAt: "2026-11-11T22:30:00.000Z",
      },
    ]);
  });

  it("IMP-05 a monthly rule becomes one-time events for 12 months", () => {
    const events = parsedEvents(fixture("monthly.ics"));

    expect(events).toHaveLength(12);
    expect(events[0]).toEqual({
      title: "Book club",
      startAt: "2026-11-06T00:00:00.000Z",
      endAt: "2026-11-06T01:30:00.000Z",
    });
    expect(events[11]?.startAt).toBe("2027-10-05T23:00:00.000Z");
    expect(events.every((event) => event.repeat === undefined)).toBe(true);
  });

  it("IMP-05 a weekly rule on two weekdays becomes one-time events", () => {
    const text = calendar(
      vevent("gym", [
        "DTSTART;TZID=America/New_York:20261103T070000",
        "RRULE:FREQ=WEEKLY;BYDAY=TU,TH",
        "SUMMARY:Gym",
      ]),
    );

    const events = parsedEvents(text);

    expect(events.length).toBeGreaterThan(100);
    expect(events.every((event) => event.repeat === undefined)).toBe(true);
  });

  it("IMP-05 a repeat with a count skips its EXDATEs and keeps its changed weeks", () => {
    expect(parsedEvents(fixture("changed-weeks.ics"))).toEqual([
      {
        title: "Swim lesson",
        startAt: "2026-11-02T21:00:00.000Z",
        endAt: "2026-11-02T22:00:00.000Z",
      },
      {
        title: "Swim lesson (moved)",
        startAt: "2026-11-17T21:00:00.000Z",
        endAt: "2026-11-17T22:00:00.000Z",
      },
      {
        title: "Swim lesson",
        startAt: "2026-11-23T21:00:00.000Z",
        endAt: "2026-11-23T22:00:00.000Z",
      },
    ]);
  });

  it("IMP-05 a 3-day all-day event becomes 3 and a timed event past midnight ends at midnight", () => {
    expect(parseIcs(fixture("days.ics"), NOW, TZ)).toEqual({
      ok: true,
      value: {
        events: [
          { title: "Grandma visits", startAt: "2026-11-06T00:00:00.000Z", allDay: true },
          {
            title: "Concert",
            startAt: "2026-11-07T02:00:00.000Z",
            endAt: "2026-11-07T05:00:00.000Z",
          },
          { title: "Grandma visits", startAt: "2026-11-07T00:00:00.000Z", allDay: true },
          { title: "Grandma visits", startAt: "2026-11-08T00:00:00.000Z", allDay: true },
        ],
        range: { first: "2026-11-06", last: "2026-11-08" },
      },
    });
  });

  it("IMP-05 a TZID event keeps its moment, with or without a VTIMEZONE", () => {
    expect(
      parsedEvents(fixture("zones.ics")).map(({ title, startAt }) => [title, startAt]),
    ).toEqual([
      ["Call with Grandpa", "2026-11-10T15:00:00.000Z"],
      ["Dentist", "2026-11-12T17:00:00.000Z"],
      ["Webinar", "2026-11-13T12:00:00.000Z"],
      ["Pancakes", "2026-11-14T13:00:00.000Z"],
    ]);
  });

  it("IMP-05 a running event is kept and an ended one dropped", () => {
    expect(parsedEvents(fixture("now.ics"))).toEqual([
      { title: "Pajama day", startAt: "2026-10-29T00:00:00.000Z", allDay: true },
      {
        title: "Field trip",
        startAt: "2026-10-29T13:00:00.000Z",
        endAt: "2026-10-29T15:00:00.000Z",
      },
    ]);
  });

  it("IMP-05 title, place and notes are trimmed and cut to 140, 60 and 280 characters", () => {
    const text = calendar(
      vevent("long", [
        "DTSTART;VALUE=DATE:20261120",
        `SUMMARY:${"t".repeat(200)}`,
        `LOCATION:${"p".repeat(80)}`,
        `DESCRIPTION:  ${"n".repeat(400)}`,
      ]),
      vevent("blank", ["DTSTART;VALUE=DATE:20261121", "SUMMARY:  ", "LOCATION: ", "DESCRIPTION:"]),
    );

    expect(parsedEvents(text)).toEqual([
      {
        title: "t".repeat(140),
        startAt: "2026-11-20T00:00:00.000Z",
        allDay: true,
        location: "p".repeat(60),
        notes: "n".repeat(280),
      },
      { title: "Untitled event", startAt: "2026-11-21T00:00:00.000Z", allDay: true },
    ]);
  });

  it("IMP-06 a non-calendar file is not-ics", () => {
    expect(parseIcs(fixture("not-calendar.ics"), NOW, TZ)).toEqual({ ok: false, error: "not-ics" });
  });

  it("IMP-06 1,001 events are not-ics and 1,000 are read", () => {
    const days = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        vevent(`e${i}`, [
          `DTSTART:${20261101 + (i % 28)}T${String(10 + (i % 10)).padStart(2, "0")}0000Z`,
          "SUMMARY:Event",
        ]),
      );

    expect(parseIcs(calendar(...days(1001)), NOW, TZ)).toEqual({ ok: false, error: "not-ics" });
    expect(parseIcs(calendar(...days(1000)), NOW, TZ).ok).toBe(true);
  });

  it("IMP-06 a repeat that expands past 1,000 events is not-ics", () => {
    const text = calendar(
      vevent("hourly", ["DTSTART:20261101T000000Z", "RRULE:FREQ=HOURLY", "SUMMARY:Ping"]),
    );

    expect(parseIcs(text, NOW, TZ)).toEqual({ ok: false, error: "not-ics" });
  });

  it("IMP-06 a file over 5 MB is not-ics", () => {
    const text = calendar(
      vevent("big", [
        "DTSTART;VALUE=DATE:20261120",
        "SUMMARY:Big",
        `DESCRIPTION:${"x".repeat(5 * 1024 * 1024)}`,
      ]),
    );

    expect(parseIcs(text, NOW, TZ)).toEqual({ ok: false, error: "not-ics" });
  });

  it("IMP-06 only past events is no-upcoming", () => {
    expect(parseIcs(fixture("past.ics"), NOW, TZ)).toEqual({ ok: false, error: "no-upcoming" });
    expect(parseIcs(calendar(), NOW, TZ)).toEqual({ ok: false, error: "no-upcoming" });
  });

  describe("attendees", () => {
    const events = parsedEvents(fixture("attendees.ics"));

    function attendeesOf(title: string) {
      return events.filter((event) => event.title === title).map((event) => event.attendees);
    }

    it("IMP-05 reads each ATTENDEE's trimmed CN and ignores the ORGANIZER", () => {
      expect(attendeesOf("Birthday party")).toEqual([["Mia", "Leo"]]);
    });

    it("IMP-05 skips an attendee with no CN or an empty one", () => {
      expect(attendeesOf("Birthday party")[0]).not.toContain("");
    });

    it("IMP-05 keeps names distinct ignoring case, at most 20, each cut to the title limit", () => {
      const [names] = attendeesOf("School assembly");

      expect(names).toHaveLength(20);
      expect(names?.[0]).toBe("A".repeat(140));
      expect(names?.slice(1)).toEqual(Array.from({ length: 19 }, (_, i) => `Kid ${i + 1}`));
    });

    it("IMP-05 an event with no attendees has none", () => {
      expect(attendeesOf("Dentist")).toEqual([undefined]);
    });

    it("IMP-05 every occurrence of an expanded repeat keeps its own VEVENT's names", () => {
      expect(attendeesOf("Tutor")).toEqual([["Ava"], ["Noah"], ["Ava"]]);
    });

    it("IMP-05 a weekly series and its changed week keep their own VEVENT's names", () => {
      const piano = events.filter((event) => event.title === "Piano");

      expect(piano.map(({ repeat, attendees }) => ({ repeat, attendees }))).toEqual([
        { repeat: "weekly", attendees: ["Ava"] },
        { repeat: undefined, attendees: ["Leo"] },
      ]);
    });
  });
});
