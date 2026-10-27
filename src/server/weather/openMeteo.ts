import "server-only";
import * as v from "valibot";
import { ok } from "@/domain/result";
import { isTimeZone } from "@/domain/signIn";
import { ForecastResponseSchema, toForecast } from "./forecast";
import { badBody, badResponse, type Fetch, getJson } from "./getJson";
import { GeocodingResponseSchema, placeQuery, toPlaces } from "./places";
import type { Coordinates, WeatherProvider } from "./provider";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

const SEARCH_COUNT = 20;

const ZoneResponseSchema = v.object({ timezone: v.string() });

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
      const url = forecastUrl(place);

      const response = await getJson(fetchFn, url, ForecastResponseSchema);

      if (!response.ok) return response;

      const forecast = toForecast(response.value, now);

      return forecast.ok ? forecast : badBody(url, forecast.error);
    },
    places: async (query) => {
      const parsed = placeQuery(query);

      const response = await getJson(fetchFn, searchUrl(parsed.search), GeocodingResponseSchema);

      return response.ok ? ok(toPlaces(response.value.results, parsed)) : response;
    },
    timeZoneAt: async (place) => {
      const url = zoneUrl(place);

      const response = await getJson(fetchFn, url, ZoneResponseSchema);

      if (!response.ok) return response;

      const { timezone } = response.value;

      return isTimeZone(timezone)
        ? ok(timezone)
        : badResponse(url, `unknown time zone ${timezone}`);
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

function zoneUrl({ lat, lon }: Coordinates): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: "auto",
    forecast_days: "1",
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
