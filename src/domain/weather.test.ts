import type { Weather } from "./schemas";
import { rainStart, retryMinutes, weatherZone } from "./weather";

const at = (hour: number) => new Date(2026, 9, 9, hour).toISOString();

const hours = (precips: (number | undefined)[]): Weather["hourly"] =>
  precips.map((precip, index) => ({
    time: at(11 + index),
    icon: "cloud",
    temp: 60,
    ...(precip !== undefined && { precip }),
  }));

const FORECAST = { location: "Portland, OR" } as Weather;

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

describe("retryMinutes", () => {
  const now = new Date(2026, 9, 9, 10, 41);

  it("FAIL-03 rounds the wait up to whole minutes", () => {
    expect(retryMinutes(new Date(2026, 9, 9, 10, 42, 30).toISOString(), now)).toBe(2);
  });

  it("FAIL-03 is 1 min for a retry less than a minute away", () => {
    expect(retryMinutes(new Date(2026, 9, 9, 10, 41, 10).toISOString(), now)).toBe(1);
  });

  it("FAIL-03 is 1 min for a retry already due", () => {
    expect(retryMinutes(new Date(2026, 9, 9, 10, 40).toISOString(), now)).toBe(1);
  });
});

describe("weatherZone", () => {
  it("WX-04 is empty without a location, even with a saved forecast", () => {
    expect(weatherZone({ located: false, weather: FORECAST, failed: false })).toEqual({
      kind: "empty",
    });
  });

  it("WX-01 is ready with the saved forecast", () => {
    expect(weatherZone({ located: true, weather: FORECAST, failed: true })).toEqual({
      kind: "ready",
      data: [FORECAST],
    });
  });

  it("WX-05 is loading while no forecast is saved yet", () => {
    expect(weatherZone({ located: true, weather: null, failed: false })).toEqual({
      kind: "loading",
    });
    expect(weatherZone({ located: true, weather: undefined, failed: false })).toEqual({
      kind: "loading",
    });
  });

  it("WX-05 fails when the fetch failed and no forecast is saved", () => {
    expect(weatherZone({ located: true, weather: null, failed: true })).toEqual({
      kind: "failed",
    });
  });
});
