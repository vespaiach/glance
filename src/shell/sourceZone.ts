import { useSyncExternalStore } from "react";
import { type SourceStatus, useRetry, useSourceStatus } from "@/data/repos";
import { retryMinutes } from "@/domain/retry";
import type { Weather } from "@/domain/schemas";
import { weatherZone } from "@/domain/weather";
import { loadingTimedOut, type ZoneState, zoneState } from "@/domain/zoneState";
import { useNow, useNowStore } from "./providers/now";

export type SourceZone<T> = {
  state: ZoneState<T>;
  retryIn: number;
  retry: () => void;
};

const LOADING = { kind: "loading" } as const;

export function useSyncedZone<T>(rows: readonly T[] | undefined): SourceZone<T> {
  const source = useSourceStatus();

  const timedOut = useTimedOut(source?.since);

  const now = useNow("minute");

  const { sync } = useRetry();

  const state: ZoneState<T> =
    rows === undefined || source === undefined ? LOADING : zoneState({ ...source, rows, timedOut });

  return { state, retryIn: retryMinutes(source?.retryAt, now), retry: sync };
}

export function useWeatherZone(
  weather: Weather | null | undefined,
  located: boolean,
): SourceZone<Weather> {
  const source = useSourceStatus();

  const timedOut = useTimedOut(weatherSince(source));

  const now = useNow("minute");

  const retry = useRetry();

  const retryAt = weatherRetryAt(source);

  const state = weatherZone({
    located: knownLocation(located, source),
    weather,
    failed: retryAt !== undefined,
    timedOut,
  });

  return { state, retryIn: retryMinutes(retryAt, now), retry: retry.weather };
}

function useTimedOut(since: Date | undefined): boolean {
  const store = useNowStore();

  const snapshot = () => since !== undefined && loadingTimedOut(since, store.get());

  return useSyncExternalStore(store.subscribe, snapshot, snapshot);
}

function weatherSince(source: SourceStatus | undefined): Date | undefined {
  if (source === undefined) return undefined;

  if (source.weather.state === "loading") return new Date(source.weather.since);

  return source.everSynced ? undefined : source.since;
}

function knownLocation(located: boolean, source: SourceStatus | undefined): boolean | undefined {
  return located || source?.everSynced ? located : undefined;
}

function weatherRetryAt(source: SourceStatus | undefined): string | undefined {
  return source?.weather.state === "failed" ? source.weather.retryAt : undefined;
}
