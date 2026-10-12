import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import type { Result } from "@/domain/result";
import type { Weather, WeatherLocation } from "@/domain/schemas";
import type { StoredWeather } from "../db";
import type { TransportError } from "../sync/transport";
import { type RepoStore, useRepoStore } from "./store";

export interface WeatherRepo {
  searchPlaces(query: string): Promise<Result<WeatherLocation[], TransportError>>;
}

export function createWeatherRepo(store: RepoStore): WeatherRepo {
  return { searchPlaces: (query) => store.places(query) };
}

export function useWeatherRepo(): WeatherRepo {
  const store = useRepoStore();

  return useMemo(() => createWeatherRepo(store), [store]);
}

function forecast(row: StoredWeather | undefined): Weather | null {
  if (row === undefined) return null;

  const { accountId: _account, ...weather } = row;

  return weather;
}

export function useWeather(): Weather | null | undefined {
  const { db, accountId } = useRepoStore();

  return useLiveQuery(async () => forecast(await db.weather.get(accountId)), [db, accountId]);
}
