import { useLiveQuery } from "dexie-react-hooks";
import type { Weather } from "@/domain/schemas";
import type { StoredWeather } from "../db";
import { useRepoStore } from "./store";

function forecast(row: StoredWeather | undefined): Weather | null {
  if (row === undefined) return null;

  const { accountId: _account, ...weather } = row;

  return weather;
}

export function useWeather(): Weather | null | undefined {
  const { db, accountId } = useRepoStore();

  return useLiveQuery(async () => forecast(await db.weather.get(accountId)), [db, accountId]);
}
