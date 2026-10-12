import type { Weather } from "./schemas";
import { rainStart, weatherZone } from "./weather";

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
