import "server-only";
import * as v from "valibot";
import { err, ok, type Result } from "@/domain/result";
import { ForecastResponseSchema, toForecast } from "./forecast";
import { GeocodingResponseSchema, placeQuery, toPlaces } from "./places";
import type { Coordinates, WeatherFailure, WeatherProvider } from "./provider";

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

const TIMEOUT_MS = 8_000;

const SEARCH_COUNT = 20;

const FORECAST_PARAMS = {
  current: [
    "temperature_2m",
    "apparent_temperature",
    "relative_humidity_2m",
    "weather_code",
    "is_day",
    "wind_speed_10m",
    "wind_direction_10m",
    "uv_index",
  ].join(","),
  hourly: ["temperature_2m", "weather_code", "precipitation_probability", "is_day"].join(","),
  daily: [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_probability_max",
    "sunset",
  ].join(","),
  temperature_unit: "fahrenheit",
  wind_speed_unit: "mph",
  timeformat: "unixtime",
  timezone: "auto",
  forecast_days: "7",
};

export function createOpenMeteo(fetchFn: Fetch): WeatherProvider {
  return {
    forecast: async (place, now) => {
      const response = await getJson(fetchFn, forecastUrl(place), ForecastResponseSchema);

      return response.ok ? toForecast(response.value, now) : response;
    },
    places: async (query) => {
      const parsed = placeQuery(query);

      const response = await getJson(fetchFn, searchUrl(parsed.search), GeocodingResponseSchema);

      return response.ok ? ok(toPlaces(response.value.results, parsed)) : response;
    },
  };
}

function forecastUrl({ lat, lon }: Coordinates): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    ...FORECAST_PARAMS,
  });

  return `${FORECAST_URL}?${params}`;
}

function searchUrl(search: string): string {
  const params = new URLSearchParams({
    name: search,
    count: String(SEARCH_COUNT),
    language: "en",
    format: "json",
    countryCode: "US",
  });

  return `${GEOCODING_URL}?${params}`;
}

async function getJson<T>(
  fetchFn: Fetch,
  url: string,
  schema: v.GenericSchema<unknown, T>,
): Promise<Result<T, WeatherFailure>> {
  try {
    const response = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

    if (!response.ok) return err("weather-failed");

    const parsed = v.safeParse(schema, await response.json());

    return parsed.success ? ok(parsed.output) : err("weather-failed");
  } catch {
    return err("weather-failed");
  }
}
