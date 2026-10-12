import type { Weather } from "./schemas";
import type { ZoneState } from "./zoneState";

const RAIN_CHANCE = 50;

const MINUTE_MS = 60_000;

export type WeatherZoneInput = {
  located: boolean;
  weather: Weather | null | undefined;
  failed: boolean;
};

export function rainStart(hourly: Weather["hourly"]): string | undefined {
  return hourly.find((point) => (point.precip ?? 0) >= RAIN_CHANCE)?.time;
}

export function retryMinutes(retryAt: string, now: Date): number {
  return Math.max(1, Math.ceil((new Date(retryAt).getTime() - now.getTime()) / MINUTE_MS));
}

export function weatherZone({ located, weather, failed }: WeatherZoneInput): ZoneState<Weather> {
  if (!located) return { kind: "empty" };

  if (weather) return { kind: "ready", data: [weather] };

  return failed ? { kind: "failed" } : { kind: "loading" };
}
