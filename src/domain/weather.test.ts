import type { Weather } from "./schemas";
import { dayForecast, hourlyByHour, rainHour, rainStart, weatherZone } from "./weather";
import { zonedInstant } from "./zone";

const at = (hour: number) => new Date(2026, 9, 9, hour).toISOString();

const hours = (precips: (number | undefined)[]): Weather["hourly"] =>
  precips.map((precip, index) => ({
    time: at(11 + index),
    icon: "cloud",
    temp: 60,
    ...(precip !== undefined && { precip }),
  }));

const FORECAST = { location: "Portland, OR", fetchedAt: "2026-10-09T16:30:00.000Z" } as Weather;

const base = { located: true, failed: false, timedOut: false };

describe("rainHour", () => {
  const icons = (list: Weather["hourly"][number]["icon"][]): Weather["hourly"] =>
    list.map((icon, index) => ({ time: at(11 + index), icon, temp: 60 }));

  it("TODAY-08 is the first drizzle or rain hour of the hourly forecast", () => {
    expect(rainHour(icons(["sun", "cloud", "cloud-drizzle", "cloud-rain"]))).toBe(at(13));
    expect(rainHour(icons(["cloud", "cloud-rain", "cloud-drizzle"]))).toBe(at(12));
  });

  it("TODAY-08 is undefined when no hour has drizzle or rain, whatever the rain chance", () => {
    expect(
      rainHour(hours([90, 90]).map((point) => ({ ...point, icon: "cloud-snow" as const }))),
    ).toBeUndefined();
  });
});

describe("rainStart", () => {
  it("WX-03 is the first of the next 8 hours with a 50% chance of rain or more", () => {
    expect(rainStart(hours([10, 10, 20, 30, 40, 70, 80, 40]))).toBe(at(16));
  });

  it("WX-03 counts exactly 50%", () => {
    expect(rainStart(hours([10, 50, 90]))).toBe(at(12));
  });

  it("WX-03 is undefined when every hour stays below 50%", () => {
    expect(rainStart(hours([10, 49, 0]))).toBeUndefined();
  });

  it("WX-03 skips hours with no chance reported", () => {
    expect(rainStart(hours([undefined, 60]))).toBe(at(12));
  });
});

describe("weatherZone", () => {
  it("WX-04 is empty without a location, even with a saved forecast", () => {
    expect(weatherZone({ ...base, located: false, weather: FORECAST })).toEqual({ kind: "empty" });
  });

  it("WX-01 is ready with the saved forecast", () => {
    expect(weatherZone({ ...base, weather: FORECAST })).toEqual({
      kind: "ready",
      data: [FORECAST],
    });
  });

  it("FAIL-02 a saved forecast after a failed fetch is ready with its fetch time", () => {
    expect(weatherZone({ ...base, weather: FORECAST, failed: true })).toEqual({
      kind: "ready",
      data: [FORECAST],
      updatedAt: FORECAST.fetchedAt,
    });
  });

  it("LOAD-02 is loading while the location isn't known before the first sync", () => {
    expect(weatherZone({ ...base, located: undefined, weather: null })).toEqual({
      kind: "loading",
    });
  });

  it("LOAD-03 an unknown location that timed out is a failure", () => {
    expect(weatherZone({ ...base, located: undefined, weather: null, timedOut: true })).toEqual({
      kind: "failed",
    });
  });

  it("WX-05 is loading while no forecast is saved yet", () => {
    expect(weatherZone({ ...base, weather: null })).toEqual({ kind: "loading" });
    expect(weatherZone({ ...base, weather: undefined })).toEqual({ kind: "loading" });
  });

  it("WX-05 fails when the fetch failed and no forecast is saved", () => {
    expect(weatherZone({ ...base, weather: null, failed: true })).toEqual({ kind: "failed" });
  });

  it("LOAD-03 fails when loading timed out with no forecast saved", () => {
    expect(weatherZone({ ...base, weather: null, timedOut: true })).toEqual({ kind: "failed" });
  });

  it("LOAD-02 a saved forecast stays ready while a refresh is slow", () => {
    expect(weatherZone({ ...base, weather: FORECAST, timedOut: true })).toEqual({
      kind: "ready",
      data: [FORECAST],
    });
  });
});

describe("hourlyByHour", () => {
  const tz = "America/Los_Angeles";

  const point = (day: number, hour: number) => ({
    time: zonedInstant(tz, { year: 2026, month: 10, day }, hour * 60).toISOString(),
    icon: "cloud" as const,
    temp: 50 + hour,
  });

  it("TL-07 keys the day's hourly points by their hour in the zone", () => {
    const byHour = hourlyByHour([point(9, 23), point(10, 0), point(10, 1)], "2026-10-10", tz);

    expect([...byHour.keys()]).toEqual([0, 1]);
    expect(byHour.get(1)?.temp).toBe(51);
  });
});

describe("dayForecast", () => {
  const day = (date: string, high: number): Weather["daily"][number] => ({
    date,
    icon: "cloud-sun",
    high,
    low: 50,
  });

  const DAILY = [
    day("2026-10-08", 64),
    day("2026-10-09", 68),
    day("2026-10-10", 70),
    day("2026-10-15", 61),
    day("2026-10-16", 59),
  ];

  const NOW = new Date("2026-10-09T17:41:00.000Z");

  const TZ = "America/Los_Angeles";

  it("EVT-01 is the forecast for the event's day when it is today", () => {
    expect(dayForecast(DAILY, "2026-10-09", NOW, TZ)).toEqual(day("2026-10-09", 68));
  });

  it("EVT-01 reaches 6 days out", () => {
    expect(dayForecast(DAILY, "2026-10-15", NOW, TZ)?.high).toBe(61);
  });

  it("EVT-01 is undefined 7 days out, even with a point for that day", () => {
    expect(dayForecast(DAILY, "2026-10-16", NOW, TZ)).toBeUndefined();
  });

  it("EVT-01 is undefined for a past day left in an older forecast", () => {
    expect(dayForecast(DAILY, "2026-10-08", NOW, TZ)).toBeUndefined();
  });

  it("EVT-01 is undefined when the forecast has no point for the day", () => {
    expect(dayForecast(DAILY, "2026-10-12", NOW, TZ)).toBeUndefined();
  });

  it("EVT-01 counts today in the screen's time zone", () => {
    const lateEvening = new Date("2026-10-10T05:30:00.000Z");

    expect(dayForecast(DAILY, "2026-10-09", lateEvening, TZ)?.high).toBe(68);
  });
});
