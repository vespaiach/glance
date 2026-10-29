import { allDayStart } from "./allDay";
import { nextOccurrence, occurrencesBetween } from "./repeat";

const NY = "America/New_York";

const SWIM = {
  id: "swim",
  startAt: "2026-10-09T20:00:00.000Z",
  endAt: "2026-10-09T21:00:00.000Z",
  repeat: "weekly" as const,
};

const TRASH = { id: "trash", startAt: allDayStart("2026-10-09"), allDay: true as const };

describe("occurrencesBetween", () => {
  it("EVT-14 a weekly event shows on the same weekday every later week", () => {
    const shown = occurrencesBetween([SWIM], "2026-10-01", "2026-10-31", NY);

    expect(shown.map((event) => event.startAt)).toEqual([
      "2026-10-09T20:00:00.000Z",
      "2026-10-16T20:00:00.000Z",
      "2026-10-23T20:00:00.000Z",
      "2026-10-30T20:00:00.000Z",
    ]);
    expect(shown.map((event) => event.id)).toEqual(["swim", "swim", "swim", "swim"]);
  });

  it("EVT-14 a weekly event never shows before its first day", () => {
    expect(occurrencesBetween([SWIM], "2026-09-01", "2026-10-09", NY)).toEqual([]);
  });

  it("EVT-14 a weekly event keeps its local time and length across DST", () => {
    const [after] = occurrencesBetween([SWIM], "2026-11-06", "2026-11-07", NY);

    expect(after).toEqual({
      ...SWIM,
      startAt: "2026-11-06T21:00:00.000Z",
      endAt: "2026-11-06T22:00:00.000Z",
    });
  });

  it("EVT-14 an all-day weekly event keeps its date across DST", () => {
    const shown = occurrencesBetween(
      [{ ...TRASH, repeat: "weekly" as const }],
      "2026-10-30",
      "2026-11-14",
      NY,
    );

    expect(shown.map((event) => event.startAt)).toEqual([
      allDayStart("2026-10-30"),
      allDayStart("2026-11-06"),
      allDayStart("2026-11-13"),
    ]);
  });

  it("EVT-14 a series with an exception date doesn't show that week and shows the next", () => {
    const shown = occurrencesBetween(
      [{ ...SWIM, exdates: ["2026-10-16"] }],
      "2026-10-10",
      "2026-10-24",
      NY,
    );

    expect(shown.map((event) => event.startAt)).toEqual(["2026-10-23T20:00:00.000Z"]);
  });

  it("EVT-14 an exception on the first day leaves out the first week", () => {
    const shown = occurrencesBetween(
      [{ ...TRASH, repeat: "weekly" as const, exdates: ["2026-10-09"] }],
      "2026-10-01",
      "2026-10-17",
      NY,
    );

    expect(shown.map((event) => event.startAt)).toEqual([allDayStart("2026-10-16")]);
  });

  it("EVT-14 an event that doesn't repeat shows only on its day", () => {
    expect(occurrencesBetween([TRASH], "2026-10-01", "2026-10-31", NY)).toEqual([TRASH]);
    expect(occurrencesBetween([TRASH], "2026-10-10", "2026-10-31", NY)).toEqual([]);
  });
});

describe("nextOccurrence", () => {
  it("TODAY-06 the next occurrence on or after a day", () => {
    expect(nextOccurrence(SWIM, "2026-10-10", NY)?.startAt).toBe("2026-10-16T20:00:00.000Z");
    expect(nextOccurrence(SWIM, "2026-10-16", NY)?.startAt).toBe("2026-10-16T20:00:00.000Z");
    expect(nextOccurrence(SWIM, "2026-10-01", NY)).toBe(SWIM);
  });

  it("EVT-14 the next occurrence skips excepted weeks", () => {
    const series = { ...SWIM, exdates: ["2026-10-09", "2026-10-16", "2026-10-23"] };

    expect(nextOccurrence(series, "2026-10-01", NY)?.startAt).toBe("2026-10-30T20:00:00.000Z");
  });

  it("TODAY-06 an event that doesn't repeat has none after its day", () => {
    expect(nextOccurrence(TRASH, "2026-10-10", NY)).toBeUndefined();
  });
});
