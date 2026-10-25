import { allDayStart } from "./allDay";
import { overlappingEvents, previewRain, previewWeather, previewWindow } from "./dayPreview";
import type { CalendarEvent, Weather } from "./schemas";

const TZ = "America/Los_Angeles";

const DAY = "2026-10-09";

const at = (hour: number, minute = 0) => new Date(Date.UTC(2026, 9, 9, hour, minute));

const timed = (id: string, start: Date, end?: Date) =>
  ({
    id,
    title: id,
    startAt: start.toISOString(),
    ...(end && { endAt: end.toISOString() }),
    everyone: true,
    tagIds: [],
    notify: true,
  }) satisfies CalendarEvent;

const allDay = (id: string, day: string) =>
  ({
    id,
    title: id,
    startAt: allDayStart(day),
    allDay: true,
    everyone: true,
    tagIds: [],
    notify: true,
  }) satisfies CalendarEvent;

const ids = (events: readonly CalendarEvent[]) => events.map((event) => event.id);

const overlaps = (events: CalendarEvent[], start: Date, end: Date) =>
  ids(overlappingEvents(events, start, end, "UTC"));

describe("overlappingEvents", () => {
  it("EVT-13 includes a plan that starts inside the range", () => {
    expect(overlaps([timed("a", at(9), at(10))], at(8), at(9, 30))).toEqual(["a"]);
  });

  it("EVT-13 includes a plan that spans the whole range", () => {
    expect(overlaps([timed("a", at(8), at(17))], at(9), at(10))).toEqual(["a"]);
  });

  it("EVT-13 leaves out a plan that ends exactly when the range starts", () => {
    expect(overlaps([timed("a", at(8), at(9))], at(9), at(10))).toEqual([]);
  });

  it("EVT-13 leaves out a plan that starts exactly when the range ends", () => {
    expect(overlaps([timed("a", at(10), at(11))], at(9), at(10))).toEqual([]);
  });

  it("EVT-13 counts a plan with no end as a point at its start", () => {
    const events = [timed("in", at(9, 30)), timed("edge", at(10)), timed("at", at(9))];

    expect(overlaps(events, at(9), at(10))).toEqual(["at", "in"]);
  });

  it("EVT-13 includes all-day plans on the days the range touches", () => {
    const events = [allDay("today", DAY), allDay("other", "2026-10-10")];

    expect(overlaps(events, at(9), at(10))).toEqual(["today"]);
  });

  it("EVT-13 includes an all-day plan for an all-day range", () => {
    const events = [allDay("a", DAY), timed("b", at(9), at(10)), timed("c", at(23), at(23, 30))];

    expect(
      ids(
        overlappingEvents(events, ...previewWindow(DAY, { start: 0, allDay: true }, "UTC"), "UTC"),
      ),
    ).toEqual(["a", "b", "c"]);
  });

  it("EVT-13 lists all-day plans first, then the rest by start", () => {
    const events = [
      timed("late", at(11), at(12)),
      allDay("all", DAY),
      timed("early", at(9), at(10)),
    ];

    expect(overlaps(events, at(8), at(13))).toEqual(["all", "early", "late"]);
  });

  it("EVT-13 reads an all-day plan's day in UTC and a timed plan's instant in any zone", () => {
    const start = new Date(Date.UTC(2026, 9, 9, 7));

    const events = [allDay("all", DAY), timed("a", new Date(Date.UTC(2026, 9, 9, 8)))];

    expect(ids(overlappingEvents(events, start, new Date(Date.UTC(2026, 9, 9, 9)), TZ))).toEqual([
      "all",
      "a",
    ]);
  });
});

describe("previewWindow", () => {
  it("EVT-13 spans the chosen start and end", () => {
    expect(previewWindow(DAY, { start: 9 * 60, end: 10 * 60 + 15 }, "UTC")).toEqual([
      new Date(Date.UTC(2026, 9, 9, 9)),
      new Date(Date.UTC(2026, 9, 9, 10, 15)),
    ]);
  });

  it("EVT-13 lasts 30 minutes when there is no end", () => {
    expect(previewWindow(DAY, { start: 23 * 60 + 30 }, "UTC")).toEqual([
      new Date(Date.UTC(2026, 9, 9, 23, 30)),
      new Date(Date.UTC(2026, 9, 10, 0, 0)),
    ]);
  });

  it("EVT-13 lasts 30 minutes when the end is not after the start", () => {
    expect(previewWindow(DAY, { start: 600, end: 600 }, "UTC")[1]).toEqual(
      new Date(Date.UTC(2026, 9, 9, 10, 30)),
    );
  });

  it("EVT-13 covers the whole day for an all-day plan", () => {
    expect(previewWindow(DAY, { start: 600, end: 700, allDay: true }, "UTC")).toEqual([
      new Date(Date.UTC(2026, 9, 9)),
      new Date(Date.UTC(2026, 9, 10)),
    ]);
  });
});

const hourly = (rows: [hour: number, temp: number, precip?: number][]): Weather["hourly"] =>
  rows.map(([hour, temp, precip]) => ({
    time: at(hour).toISOString(),
    icon: "cloud",
    temp,
    ...(precip !== undefined && { precip }),
  })) as Weather["hourly"];

const daily = (): Weather["daily"] =>
  Array.from({ length: 7 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 9, 9 + index)).toISOString().slice(0, 10),
    icon: "sun",
    high: 70 + index,
    low: 50,
  })) as Weather["daily"];

const forecast = (rows: Weather["hourly"]) =>
  ({ hourly: rows, daily: daily() }) as unknown as Weather;

const NOW = at(8);

const local = (weather: Weather | null, times: { start: number; end?: number; allDay?: true }) =>
  previewWeather(weather, DAY, times, NOW, "UTC");

describe("previewWeather", () => {
  const rows = hourly([
    [9, 55],
    [10, 57, 40],
    [11, 60],
    [12, 62],
    [13, 64],
    [14, 65],
    [15, 66],
  ]);

  it("EVT-13 shows the start hour alone for an event of an hour or less", () => {
    expect(local(forecast(rows), { start: 9 * 60, end: 10 * 60 })).toEqual({
      kind: "hours",
      hours: [rows[0]],
    });
  });

  it("EVT-13 shows each hour an event covers", () => {
    expect(local(forecast(rows), { start: 9 * 60, end: 11 * 60 + 30 })).toEqual({
      kind: "hours",
      hours: [rows[0], rows[1], rows[2]],
    });
  });

  it("EVT-13 uses a 30 minute event when there is no end", () => {
    expect(local(forecast(rows), { start: 9 * 60 })).toEqual({ kind: "hours", hours: [rows[0]] });
  });

  it("EVT-13 shows at most 6 hours, spaced evenly for a longer event", () => {
    const result = local(forecast(rows), { start: 9 * 60, end: 16 * 60 });

    expect(result).toEqual({ kind: "hours", hours: [rows[0], rows[2], rows[4], rows[6]] });
  });

  it("EVT-13 skips hours the forecast does not cover", () => {
    expect(local(forecast(rows), { start: 14 * 60, end: 18 * 60 })).toEqual({
      kind: "hours",
      hours: [rows[5], rows[6]],
    });
  });

  it("EVT-13 falls back to the day high when no hour is covered", () => {
    expect(local(forecast(rows), { start: 20 * 60, end: 21 * 60 })).toEqual({
      kind: "day",
      point: daily()[0],
    });
  });

  it("EVT-13 shows the day high for an all-day event", () => {
    expect(local(forecast(rows), { start: 0, allDay: true })).toEqual({
      kind: "day",
      point: daily()[0],
    });
  });

  it("EVT-13 has no forecast for a day past the forecast or without a saved forecast", () => {
    const far = previewWeather(forecast(rows), "2026-10-20", { start: 600 }, NOW, "UTC");

    expect(far).toBeUndefined();
    expect(local(null, { start: 600 })).toBeUndefined();
  });
});

describe("previewRain", () => {
  it("EVT-13 is the highest rain chance across the hours, from 30%", () => {
    expect(
      previewRain(
        hourly([
          [9, 50, 10],
          [10, 50, 45],
          [11, 50, 30],
        ]),
      ),
    ).toBe(45);
    expect(previewRain(hourly([[9, 50, 30]]))).toBe(30);
  });

  it("EVT-13 is undefined below 30% or with no chance reported", () => {
    expect(
      previewRain(
        hourly([
          [9, 50, 29],
          [10, 50],
        ]),
      ),
    ).toBeUndefined();
  });
});
