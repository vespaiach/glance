import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { err, ok } from "@/domain/result";
import type { WeatherLocation } from "@/domain/schemas";
import type { Forecast, WeatherProvider } from "../weather/provider";
import { putSettings } from "./settings";
import { MARIA, OMAR, serviceHarnessPerTest } from "./testServices";
import { accountWeather, searchPlaces, type WeatherDeps } from "./weather";

const harness = serviceHarnessPerTest();

const PORTLAND = { name: "Portland", region: "Oregon", lat: 45.52, lon: -122.68 };

const AUSTIN = { name: "Austin", region: "Texas", lat: 30.27, lon: -97.74 };

const MINUTE_MS = 60_000;

function forecastAt(now: Date, temp = 64): Forecast {
  return {
    fetchedAt: now.toISOString(),
    current: {
      temp,
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
    },
    hourly: Array.from({ length: 8 }, (_, index) => ({
      time: new Date(now.getTime() + (index + 1) * 60 * MINUTE_MS).toISOString(),
      icon: "cloud-sun" as const,
      temp,
    })),
    daily: Array.from({ length: 7 }, (_, index) => ({
      date: `2026-10-${String(9 + index).padStart(2, "0")}`,
      icon: "sun" as const,
      high: 68,
      low: 51,
    })),
  };
}

function fakeProvider() {
  let temp = 64;

  const provider = {
    forecast: vi.fn<WeatherProvider["forecast"]>(async (_place, now) => ok(forecastAt(now, temp))),
    places: vi.fn<WeatherProvider["places"]>(async () => ok([PORTLAND])),
  };

  return {
    provider,
    nextTemp: (next: number) => {
      temp = next;
    },
  };
}

let fake = fakeProvider();

beforeEach(() => {
  fake = fakeProvider();
});

function deps(): WeatherDeps {
  return { ...harness.deps(), provider: fake.provider };
}

function locate(accountId: string, weatherLocation: WeatherLocation | undefined): void {
  putSettings(harness.deps(), accountId, accountId, { ...DEFAULT_SETTINGS, weatherLocation });
}

describe("accountWeather", () => {
  it("WX-01 answers the forecast for the account's place, named by city and state code", async () => {
    locate(MARIA, PORTLAND);

    const answer = await accountWeather(deps(), MARIA);

    expect(answer).toEqual(ok({ location: "Portland, OR", ...forecastAt(harness.deps().now()) }));
    expect(fake.provider.forecast).toHaveBeenCalledWith(PORTLAND, harness.deps().now());
  });

  it("WX-06 serves the saved forecast for 15 minutes without asking the service again", async () => {
    locate(MARIA, PORTLAND);
    const first = await accountWeather(deps(), MARIA);
    harness.advance(15 * MINUTE_MS - 1);
    fake.nextTemp(70);

    expect(await accountWeather(deps(), MARIA)).toEqual(first);
    expect(fake.provider.forecast).toHaveBeenCalledTimes(1);
  });

  it("WX-06 asks the service again once the saved forecast is 15 minutes old", async () => {
    locate(MARIA, PORTLAND);
    await accountWeather(deps(), MARIA);
    harness.advance(15 * MINUTE_MS);
    fake.nextTemp(70);

    const answer = await accountWeather(deps(), MARIA);

    expect(answer.ok && answer.value.current.temp).toBe(70);
    expect(fake.provider.forecast).toHaveBeenCalledTimes(2);
  });

  it("WX-04 asks the service again for a newly picked place", async () => {
    locate(MARIA, PORTLAND);
    await accountWeather(deps(), MARIA);
    locate(MARIA, AUSTIN);

    const answer = await accountWeather(deps(), MARIA);

    expect(answer.ok && answer.value.location).toBe("Austin, TX");
    expect(fake.provider.forecast).toHaveBeenLastCalledWith(AUSTIN, harness.deps().now());
  });

  it("WX-04 answers no-location when the account has picked no place", async () => {
    locate(MARIA, undefined);

    expect(await accountWeather(deps(), MARIA)).toEqual(err("no-location"));
    expect(fake.provider.forecast).not.toHaveBeenCalled();
  });

  it("WX-04 answers no-location when the account has no settings yet", async () => {
    expect(await accountWeather(deps(), MARIA)).toEqual(err("no-location"));
  });

  it("WX-05 answers weather-failed when the service fails, and keeps no forecast", async () => {
    locate(MARIA, PORTLAND);
    fake.provider.forecast.mockResolvedValueOnce(err("weather-failed"));

    expect(await accountWeather(deps(), MARIA)).toEqual(err("weather-failed"));
    expect((await accountWeather(deps(), MARIA)).ok).toBe(true);
    expect(fake.provider.forecast).toHaveBeenCalledTimes(2);
  });

  it("tech§5 never serves another account's saved forecast", async () => {
    locate(OMAR, PORTLAND);
    locate(MARIA, PORTLAND);
    await accountWeather(deps(), OMAR);
    fake.nextTemp(70);

    const answer = await accountWeather(deps(), MARIA);

    expect(answer.ok && answer.value.current.temp).toBe(70);
    expect(fake.provider.forecast).toHaveBeenCalledTimes(2);
  });

  it("tech§5 never overwrites another account's saved forecast", async () => {
    locate(OMAR, PORTLAND);
    locate(MARIA, AUSTIN);
    const omars = await accountWeather(deps(), OMAR);
    await accountWeather(deps(), MARIA);

    expect(await accountWeather(deps(), OMAR)).toEqual(omars);
    expect(fake.provider.forecast).toHaveBeenCalledTimes(2);
  });
});

describe("searchPlaces", () => {
  it("WX-09 answers the service's matches for the query", async () => {
    expect(await searchPlaces(deps(), "Portland")).toEqual(ok([PORTLAND]));
    expect(fake.provider.places).toHaveBeenCalledWith("Portland");
  });

  it("WX-07 answers weather-failed when the search fails", async () => {
    fake.provider.places.mockResolvedValueOnce(err("weather-failed"));

    expect(await searchPlaces(deps(), "Portland")).toEqual(err("weather-failed"));
  });
});
