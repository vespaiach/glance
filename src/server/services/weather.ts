import "server-only";
import { err, ok, type Result } from "@/domain/result";
import type { AccountSettings, Weather, WeatherLocation } from "@/domain/schemas";
import type { Db } from "../db/db";
import { placeLabel } from "../weather/places";
import type {
  Coordinates,
  LocateFailure,
  PlaceLocator,
  WeatherFailure,
  WeatherProvider,
} from "../weather/provider";
import type { ServiceDeps } from "./deps";

export type WeatherDeps = ServiceDeps & { provider: WeatherProvider };

export type WeatherError = "no-location" | WeatherFailure;

export type LocateDeps = { provider: WeatherProvider; locator: PlaceLocator };

export const WEATHER_CACHE_MS = 15 * 60 * 1000;

type CacheRow = { location: string; json: string; fetched_at: string };

export async function accountWeather(
  { db, now, provider }: WeatherDeps,
  accountId: string,
): Promise<Result<Weather, WeatherError>> {
  const place = await weatherLocation(db, accountId);

  if (!place) return err("no-location");

  const asked = now();

  const cached = await freshCache(db, accountId, placeKey(place), asked);

  if (cached) return ok(cached);

  const fetched = await provider.forecast(place, asked);

  if (!fetched.ok) return fetched;

  const weather = { location: placeLabel(place), ...fetched.value };

  await saveCache(db, accountId, placeKey(place), weather);

  return ok(weather);
}

export function searchPlaces(
  { provider }: Pick<WeatherDeps, "provider">,
  query: string,
): Promise<Result<WeatherLocation[], WeatherFailure>> {
  return provider.places(query);
}

export async function locatePlace(
  { provider, locator }: LocateDeps,
  position: Coordinates,
): Promise<Result<WeatherLocation, LocateFailure>> {
  const at = roundedPoint(position);

  const [place, timeZone] = await Promise.all([locator.placeAt(at), provider.timeZoneAt(at)]);

  if (!place.ok) return place;

  if (!timeZone.ok) return timeZone;

  return ok({ ...place.value, ...at, timeZone: timeZone.value });
}

export function roundedPoint({ lat, lon }: Coordinates): Coordinates {
  return { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 };
}

async function weatherLocation(db: Db, accountId: string): Promise<WeatherLocation | undefined> {
  const row = await db.one<{ json: AccountSettings }>(
    "SELECT json FROM settings WHERE account_id = $1",
    [accountId],
  );

  return row?.json.weatherLocation;
}

function placeKey({ lat, lon }: WeatherLocation): string {
  return `${lat},${lon}`;
}

async function freshCache(
  db: Db,
  accountId: string,
  key: string,
  now: Date,
): Promise<Weather | undefined> {
  const row = await db.one<CacheRow>(
    "SELECT location, json, fetched_at FROM weather_cache WHERE account_id = $1",
    [accountId],
  );

  if (!row || row.location !== key) return undefined;

  const age = now.getTime() - Date.parse(row.fetched_at);

  return age < WEATHER_CACHE_MS ? (JSON.parse(row.json) as Weather) : undefined;
}

async function saveCache(db: Db, accountId: string, key: string, weather: Weather): Promise<void> {
  await db.run(
    `INSERT INTO weather_cache (account_id, location, json, fetched_at) VALUES ($1, $2, $3, $4)
     ON CONFLICT (account_id) DO UPDATE SET location = excluded.location, json = excluded.json,
       fetched_at = excluded.fetched_at`,
    [accountId, key, JSON.stringify(weather), weather.fetchedAt],
  );
}
