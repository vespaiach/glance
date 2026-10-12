import type { Breakpoint } from "./breakpoint";

export const OFFLINE_PILL_DELAY_MS = 30_000;

const STALE_FORECAST_MS = 60 * 60 * 1000;

export function offlinePillShown(
  offlineSince: Date | undefined,
  now: Date,
  delayMs = OFFLINE_PILL_DELAY_MS,
): boolean {
  if (offlineSince === undefined) return false;

  return now.getTime() - offlineSince.getTime() >= delayMs;
}

export function forecastStale(fetchedAt: string, now: Date): boolean {
  return now.getTime() - Date.parse(fetchedAt) > STALE_FORECAST_MS;
}

export function savedTimeShown(breakpoint: Breakpoint, onWeather: boolean): boolean {
  if (onWeather) return false;

  return breakpoint === "wide" || breakpoint === "mid";
}
