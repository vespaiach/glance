import type { Weather } from "./schemas";
import type { ZoneState } from "./zoneState";

const RAIN_CHANCE = 50;

export type WeatherZoneInput = {
  located: boolean | undefined;
  weather: Weather | null | undefined;
  failed: boolean;
  timedOut: boolean;
};

export function rainStart(hourly: Weather["hourly"]): string | undefined {
  return hourly.find((point) => (point.precip ?? 0) >= RAIN_CHANCE)?.time;
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
