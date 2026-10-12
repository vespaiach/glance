import "server-only";
import * as v from "valibot";
import { err, ok, type Result } from "@/domain/result";
import { WeatherSchema } from "@/domain/schemas";
import { wmo } from "@/domain/wmo";
import type { Forecast, WeatherFailure } from "./provider";

const numbers = v.array(v.number());

const chances = v.array(v.nullable(v.number()));

export const ForecastResponseSchema = v.object({
  utc_offset_seconds: v.number(),
  current: v.object({
    temperature_2m: v.number(),
    apparent_temperature: v.number(),
    relative_humidity_2m: v.number(),
    weather_code: v.number(),
    is_day: v.number(),
    wind_speed_10m: v.number(),
    wind_direction_10m: v.number(),
    uv_index: v.number(),
  }),
  hourly: v.object({
    time: numbers,
    temperature_2m: numbers,
    weather_code: numbers,
    precipitation_probability: chances,
    is_day: numbers,
  }),
  daily: v.object({
    time: numbers,
    weather_code: numbers,
    temperature_2m_max: numbers,
    temperature_2m_min: numbers,
    precipitation_probability_max: chances,
    sunset: numbers,
  }),
});

export type ForecastResponse = v.InferOutput<typeof ForecastResponseSchema>;

type Hourly = ForecastResponse["hourly"];

const ForecastSchema = v.omit(WeatherSchema, ["location"]);

const HOURS_SHOWN = 8;

const DAYS_SHOWN = 7;

const MIN_DAILY_CHANCE = 10;

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export function toForecast(
  response: ForecastResponse,
  now: Date,
): Result<Forecast, WeatherFailure> {
  const built = {
    fetchedAt: now.toISOString(),
    current: currentConditions(response),
    hourly: nextHours(response.hourly, now),
    daily: days(response),
  };

  const parsed = v.safeParse(ForecastSchema, built);

  return parsed.success ? ok(parsed.output) : err("weather-failed");
}

function currentConditions({ current, daily }: ForecastResponse) {
  const weather = wmo(current.weather_code, current.is_day === 1);

  return {
    temp: Math.round(current.temperature_2m),
    condition: weather?.condition,
    icon: weather?.icon,
    high: rounded(daily.temperature_2m_max[0]),
    low: rounded(daily.temperature_2m_min[0]),
    feelsLike: Math.round(current.apparent_temperature),
    windMph: Math.round(current.wind_speed_10m),
    windDir: compass(current.wind_direction_10m),
    humidity: Math.round(current.relative_humidity_2m),
    uv: Math.round(current.uv_index),
    sunset: isoTime(daily.sunset[0]),
  };
}

function nextHours(hourly: Hourly, now: Date) {
  const first = hourly.time.findIndex((time) => time * 1000 > now.getTime());

  if (first < 0) return [];

  return hourly.time.slice(first, first + HOURS_SHOWN).map((time, offset) => {
    const index = first + offset;

    const precip = hourly.precipitation_probability[index];

    return {
      time: isoTime(time),
      icon: iconFor(hourly.weather_code[index], hourly.is_day[index] === 1),
      temp: rounded(hourly.temperature_2m[index]),
      ...(precip != null && { precip: Math.round(precip) }),
    };
  });
}

function days({ daily, utc_offset_seconds }: ForecastResponse) {
  return daily.time.slice(0, DAYS_SHOWN).map((time, index) => {
    const precip = daily.precipitation_probability_max[index];

    return {
      date: new Date((time + utc_offset_seconds) * 1000).toISOString().slice(0, 10),
      icon: iconFor(daily.weather_code[index], true),
      high: rounded(daily.temperature_2m_max[index]),
      low: rounded(daily.temperature_2m_min[index]),
      ...(precip != null && precip >= MIN_DAILY_CHANCE && { precip: Math.round(precip) }),
    };
  });
}

function iconFor(code: number | undefined, isDay: boolean) {
  return code === undefined ? undefined : wmo(code, isDay)?.icon;
}

function rounded(value: number | undefined): number | undefined {
  return value === undefined ? undefined : Math.round(value);
}

function isoTime(seconds: number | undefined): string | undefined {
  return seconds === undefined ? undefined : new Date(seconds * 1000).toISOString();
}

function compass(degrees: number): string {
  return COMPASS[Math.round(degrees / 45) % COMPASS.length] ?? "N";
}
