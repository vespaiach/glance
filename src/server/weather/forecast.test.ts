import { type ForecastResponse, toForecast } from "./forecast";

const NOW = new Date("2026-10-09T17:30:00.000Z");

const OFFSET_S = -7 * 60 * 60;

const MIDNIGHT_S = Date.parse("2026-10-09T07:00:00.000Z") / 1000;

const HOUR_S = 60 * 60;

const DAY_S = 24 * HOUR_S;

function hours(count: number) {
  const indexes = Array.from({ length: count }, (_, index) => index);

  return {
    time: indexes.map((index) => MIDNIGHT_S + index * HOUR_S),
    temperature_2m: indexes.map((index) => 50 + index / 2),
    weather_code: indexes.map((index) => (index === 16 ? 61 : 2)),
    precipitation_probability: indexes.map((index) => (index === 16 ? 70 : null)),
    is_day: indexes.map((index) => (index >= 7 && index < 19 ? 1 : 0)),
  };
}

function response(overrides: Partial<ForecastResponse> = {}): ForecastResponse {
  return {
    utc_offset_seconds: OFFSET_S,
    current: {
      temperature_2m: 63.6,
      apparent_temperature: 61.5,
      relative_humidity_2m: 62,
      weather_code: 2,
      is_day: 1,
      wind_speed_10m: 7.8,
      wind_direction_10m: 310,
      uv_index: 2.7,
    },
    hourly: hours(48),
    daily: {
      time: Array.from({ length: 7 }, (_, index) => MIDNIGHT_S + index * DAY_S),
      weather_code: [2, 61, 3, 0, 0, 1, 95],
      temperature_2m_max: [68.4, 59, 61, 66, 69, 65, 58],
      temperature_2m_min: [50.6, 48, 47, 49, 50, 50, 46],
      precipitation_probability_max: [20, 80, 30, 0, 9, null, 70],
      sunset: Array.from({ length: 7 }, (_, index) => MIDNIGHT_S + index * DAY_S + 18.7 * HOUR_S),
    },
    ...overrides,
  };
}

function forecast(overrides: Partial<ForecastResponse> = {}) {
  const answer = toForecast(response(overrides), NOW);

  if (!answer.ok) throw new Error("bad forecast");

  return answer.value;
}

describe("toForecast", () => {
  it("WX-01 maps the current conditions in °F and mph, with today's high and low", () => {
    expect(forecast().current).toEqual({
      temp: 64,
      condition: "partlyCloudy",
      icon: "cloud-sun",
      high: 68,
      low: 51,
      feelsLike: 62,
      windMph: 8,
      windDir: "NW",
      humidity: 62,
      uv: 3,
      sunset: "2026-10-10T01:42:00.000Z",
    });
  });

  it("WX-01 uses the night icon after dark", () => {
    const night = response().current;

    expect(forecast({ current: { ...night, is_day: 0 } }).current.icon).toBe("cloud-moon");
  });

  it("WX-01 lists the 8 whole hours after now with their icon, temperature and rain chance", () => {
    expect(forecast().hourly).toEqual([
      { time: "2026-10-09T18:00:00.000Z", icon: "cloud-sun", temp: 56 },
      { time: "2026-10-09T19:00:00.000Z", icon: "cloud-sun", temp: 56 },
      { time: "2026-10-09T20:00:00.000Z", icon: "cloud-sun", temp: 57 },
      { time: "2026-10-09T21:00:00.000Z", icon: "cloud-sun", temp: 57 },
      { time: "2026-10-09T22:00:00.000Z", icon: "cloud-sun", temp: 58 },
      { time: "2026-10-09T23:00:00.000Z", icon: "cloud-rain", temp: 58, precip: 70 },
      { time: "2026-10-10T00:00:00.000Z", icon: "cloud-sun", temp: 59 },
      { time: "2026-10-10T01:00:00.000Z", icon: "cloud-sun", temp: 59 },
    ]);
  });

  it("WX-01 uses the night icon for an hour after dark", () => {
    const evening = toForecast(response(), new Date("2026-10-10T00:30:00.000Z"));

    expect(evening.ok && evening.value.hourly.slice(0, 2)).toEqual([
      { time: "2026-10-10T01:00:00.000Z", icon: "cloud-sun", temp: 59 },
      { time: "2026-10-10T02:00:00.000Z", icon: "cloud-moon", temp: 60 },
    ]);
  });

  it("WX-01 lists 7 days by the place's local date, with a rain chance only from 10%", () => {
    expect(forecast().daily).toEqual([
      { date: "2026-10-09", icon: "cloud-sun", high: 68, low: 51, precip: 20 },
      { date: "2026-10-10", icon: "cloud-rain", high: 59, low: 48, precip: 80 },
      { date: "2026-10-11", icon: "cloudy", high: 61, low: 47, precip: 30 },
      { date: "2026-10-12", icon: "sun", high: 66, low: 49 },
      { date: "2026-10-13", icon: "sun", high: 69, low: 50 },
      { date: "2026-10-14", icon: "cloud-sun", high: 65, low: 50 },
      { date: "2026-10-15", icon: "cloud-lightning", high: 58, low: 46, precip: 70 },
    ]);
  });

  it("WX-01 dates the forecast with the time it was fetched", () => {
    expect(forecast().fetchedAt).toBe("2026-10-09T17:30:00.000Z");
  });

  it("D13 fails on a weather code the app has no icon for", () => {
    const current = { ...response().current, weather_code: 42 };

    expect(toForecast(response({ current }), NOW)).toMatchObject({
      ok: false,
      error: [
        { path: [{ key: "current" }, { key: "condition" }] },
        { path: [{ key: "current" }, { key: "icon" }] },
      ],
    });
  });

  it("D13 fails when fewer than 8 hours are left in the forecast", () => {
    expect(
      toForecast(response({ hourly: hours(24) }), new Date("2026-10-10T00:30:00.000Z")),
    ).toMatchObject({ ok: false, error: [{ path: [{ key: "hourly" }] }] });
  });

  it("D13 fails when fewer than 7 days come back", () => {
    const daily = { ...response().daily, time: response().daily.time.slice(0, 6) };

    expect(toForecast(response({ daily }), NOW)).toMatchObject({
      ok: false,
      error: [{ path: [{ key: "daily" }] }],
    });
  });
});
