import type { Weather } from "./schemas";
import { minutesOfDay } from "./time";
import { dateKey } from "./zone";
import type { ZoneState } from "./zoneState";

export type HourlyPoint = Weather["hourly"][number];

const RAIN_CHANCE = 50;

const RAIN_ICONS: ReadonlySet<HourlyPoint["icon"]> = new Set(["cloud-drizzle", "cloud-rain"]);

export type WeatherZoneInput = {
  located: boolean | undefined;
  weather: Weather | null | undefined;
  failed: boolean;
  timedOut: boolean;
};

export function rainStart(hourly: Weather["hourly"]): string | undefined {
  return hourly.find((point) => (point.precip ?? 0) >= RAIN_CHANCE)?.time;
}

export function rainHour(hourly: Weather["hourly"]): string | undefined {
  return hourly.find((point) => RAIN_ICONS.has(point.icon))?.time;
}

export function hourlyByHour(
  hourly: Weather["hourly"],
  day: string,
  tz: string,
): Map<number, HourlyPoint> {
  const points = hourly.filter((point) => dateKey(new Date(point.time), tz) === day);

  return new Map(points.map((point) => [hourOf(point, tz), point]));
}

export function weatherZone({
  located,
  weather,
  failed,
  timedOut,
}: WeatherZoneInput): ZoneState<Weather> {
  if (located === false) return { kind: "empty" };

  if (weather) {
    return failed
      ? { kind: "ready", data: [weather], updatedAt: weather.fetchedAt }
      : { kind: "ready", data: [weather] };
  }

  return failed || timedOut ? { kind: "failed" } : { kind: "loading" };
}

function hourOf(point: HourlyPoint, tz: string): number {
  return Math.floor(minutesOfDay(new Date(point.time), tz) / 60);
}
