import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import type { Result } from "@/domain/result";
import type { Weather, WeatherLocation } from "@/domain/schemas";
import type { StoredWeather } from "../db";
import type { Coordinates, LocateError, TransportError } from "../sync/transport";
import { type RepoStore, useRepoStore } from "./store";

export interface WeatherRepo {
  searchPlaces(query: string): Promise<Result<WeatherLocation[], TransportError>>;
  locate(position: Coordinates): Promise<Result<WeatherLocation, LocateError>>;
}

export function createWeatherRepo(store: RepoStore): WeatherRepo {
  return {
    searchPlaces: (query) => store.places(query),
    locate: (position) => store.locate(position),
  };
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
