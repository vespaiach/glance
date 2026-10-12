import type { TransportError } from "./transport";

export const STATUS_KEY = "status";

export type SyncError = "unauthorized" | "outdated" | "server";

export type WeatherStatus =
  | { state: "idle" }
  | { state: "loading"; since: string }
  | { state: "failed"; retryAt: string };

export type SyncStatus = {
  online: boolean;
  lastSyncedAt?: string;
  error?: SyncError;
  retryAt?: string;
  weather: WeatherStatus;
};

export type StatusEvent =
  | { type: "synced"; at: string }
  | { type: "failed"; error: Exclude<TransportError, "invalid">; retryAt?: string }
  | { type: "weather-loading"; at: string }
  | { type: "weather-loaded" }
  | { type: "weather-failed"; retryAt: string };

export const INITIAL_STATUS: SyncStatus = { online: true, weather: { state: "idle" } };

function withoutError({ error: _, retryAt: _retry, ...status }: SyncStatus): SyncStatus {
  return status;
}

function retryingAt(retryAt: string | undefined) {
  return retryAt === undefined ? {} : { retryAt };
}

export function nextStatus(status: SyncStatus, event: StatusEvent): SyncStatus {
  switch (event.type) {
    case "synced":
      return { ...withoutError(status), online: true, lastSyncedAt: event.at };
    case "failed":
      return event.error === "network"
        ? { ...withoutError(status), online: false, ...retryingAt(event.retryAt) }
        : {
            ...withoutError(status),
            online: true,
            error: event.error,
            ...retryingAt(event.retryAt),
          };
    case "weather-loading":
      return { ...status, weather: { state: "loading", since: event.at } };
    case "weather-loaded":
      return { ...status, weather: { state: "idle" } };
    case "weather-failed":
      return { ...status, weather: { state: "failed", retryAt: event.retryAt } };
  }
}
