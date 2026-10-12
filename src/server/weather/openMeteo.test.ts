import { createOpenMeteo } from "./openMeteo";

const NOW = new Date("2026-10-09T17:30:00.000Z");

const PORTLAND = { name: "Portland", region: "Oregon", lat: 45.52, lon: -122.68 };

const HOUR_S = 60 * 60;

const MIDNIGHT_S = Date.parse("2026-10-09T07:00:00.000Z") / 1000;

const series = <T>(count: number, value: (index: number) => T): T[] =>
  Array.from({ length: count }, (_, index) => value(index));

const FORECAST_BODY = {
  latitude: 45.5,
  utc_offset_seconds: -25200,
  current: {
    time: MIDNIGHT_S,
    temperature_2m: 64,
    apparent_temperature: 62,
    relative_humidity_2m: 62,
    weather_code: 2,
    is_day: 1,
    wind_speed_10m: 8,
    wind_direction_10m: 315,
    uv_index: 3,
  },
  hourly: {
    time: series(48, (index) => MIDNIGHT_S + index * HOUR_S),
    temperature_2m: series(48, () => 60),
    weather_code: series(48, () => 0),
    precipitation_probability: series(48, () => 0),
    is_day: series(48, () => 1),
  },
  daily: {
    time: series(7, (index) => MIDNIGHT_S + index * 24 * HOUR_S),
    weather_code: series(7, () => 0),
    temperature_2m_max: series(7, () => 68),
    temperature_2m_min: series(7, () => 51),
    precipitation_probability_max: series(7, () => 0),
    sunset: series(7, (index) => MIDNIGHT_S + index * 24 * HOUR_S + 18 * HOUR_S),
  },
};

function answering(body: unknown, status = 200) {
  return vi.fn(async (_url: string, _init?: RequestInit) => Response.json(body, { status }));
}

function calledUrl(fetchFn: ReturnType<typeof answering>): URL {
  return new URL(String(fetchFn.mock.calls[0]?.[0]));
}

describe("createOpenMeteo forecast", () => {
  it("D13 asks for the place's forecast in °F, mph and Unix time in the place's time zone", async () => {
    const fetchFn = answering(FORECAST_BODY);

    await createOpenMeteo(fetchFn).forecast(PORTLAND, NOW);

    const url = calledUrl(fetchFn);

    expect(url.origin + url.pathname).toBe("https://api.open-meteo.com/v1/forecast");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      latitude: "45.52",
      longitude: "-122.68",
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      timeformat: "unixtime",
      timezone: "auto",
      forecast_days: "7",
    });
  });

  it("WX-01 answers the mapped forecast", async () => {
    const answer = await createOpenMeteo(answering(FORECAST_BODY)).forecast(PORTLAND, NOW);

    expect(answer).toMatchObject({
      ok: true,
      value: { fetchedAt: NOW.toISOString(), current: { temp: 64, windDir: "NW" } },
    });
  });

  it("WX-05 fails when the service errors", async () => {
    const answer = await createOpenMeteo(answering({ error: true }, 500)).forecast(PORTLAND, NOW);

    expect(answer).toEqual({ ok: false, error: "weather-failed" });
  });

  it("WX-05 fails when the service can't be reached", async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });

    expect(await createOpenMeteo(fetchFn).forecast(PORTLAND, NOW)).toEqual({
      ok: false,
      error: "weather-failed",
    });
  });

  it("WX-05 fails on an answer of the wrong shape", async () => {
    const answer = await createOpenMeteo(answering({ current: {} })).forecast(PORTLAND, NOW);

    expect(answer).toEqual({ ok: false, error: "weather-failed" });
  });
});

describe("createOpenMeteo places", () => {
  it("WX-09 searches US places by the city part of the query", async () => {
    const fetchFn = answering({});

    await createOpenMeteo(fetchFn).places("Austin, TX");

    const url = calledUrl(fetchFn);

    expect(url.origin + url.pathname).toBe("https://geocoding-api.open-meteo.com/v1/search");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      name: "Austin",
      countryCode: "US",
      language: "en",
    });
  });

  it("LOC-05 answers the matching places with their time zones", async () => {
    const fetchFn = answering({
      results: [
        {
          name: "Austin",
          admin1: "Texas",
          latitude: 30.26715,
          longitude: -97.74306,
          timezone: "America/Chicago",
          id: 1,
        },
        {
          name: "Austin",
          admin1: "Minnesota",
          latitude: 43.66663,
          longitude: -92.97464,
          timezone: "America/Chicago",
        },
      ],
    });

    expect(await createOpenMeteo(fetchFn).places("Austin, TX")).toEqual({
      ok: true,
      value: [
        {
          name: "Austin",
          region: "Texas",
          lat: 30.26715,
          lon: -97.74306,
          timeZone: "America/Chicago",
        },
      ],
    });
  });

  it("WX-08 answers no places when nothing matches", async () => {
    expect(await createOpenMeteo(answering({})).places("Pordland")).toEqual({
      ok: true,
      value: [],
    });
  });

  it("WX-07 fails when the search service errors", async () => {
    expect(await createOpenMeteo(answering({}, 503)).places("Portland")).toEqual({
      ok: false,
      error: "weather-failed",
    });
  });
});

describe("createOpenMeteo timeZoneAt", () => {
  const ZONE_BODY = { latitude: 45.528744, timezone: "America/Los_Angeles" };

  it("LOC-04 asks the forecast endpoint for one day in the place's own time zone", async () => {
    const fetchFn = answering(ZONE_BODY);

    await createOpenMeteo(fetchFn).timeZoneAt({ lat: 45.52, lon: -122.68 });

    const url = calledUrl(fetchFn);

    expect(url.origin + url.pathname).toBe("https://api.open-meteo.com/v1/forecast");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      latitude: "45.52",
      longitude: "-122.68",
      timezone: "auto",
      forecast_days: "1",
    });
  });

  it("LOC-04 answers the time zone at the coordinates", async () => {
    expect(await createOpenMeteo(answering(ZONE_BODY)).timeZoneAt(PORTLAND)).toEqual({
      ok: true,
      value: "America/Los_Angeles",
    });
  });

  it("LOC-05 fails on a zone that isn't a valid IANA zone, or when the service errors", async () => {
    const failed = { ok: false, error: "weather-failed" };

    expect(
      await createOpenMeteo(answering({ timezone: "Mars/Olympus" })).timeZoneAt(PORTLAND),
    ).toEqual(failed);
    expect(await createOpenMeteo(answering({}, 500)).timeZoneAt(PORTLAND)).toEqual(failed);
  });
});
