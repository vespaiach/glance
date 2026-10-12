import "server-only";
import * as v from "valibot";
import { err, ok, type Result } from "@/domain/result";
import type { WeatherFailure } from "./provider";

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const TIMEOUT_MS = 8_000;

export async function getJson<T>(
  fetchFn: Fetch,
  url: string,
  schema: v.GenericSchema<unknown, T>,
): Promise<Result<T, WeatherFailure>> {
  try {
    const response = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

    if (!response.ok) return err("weather-failed");

    const parsed = v.safeParse(schema, await response.json());

    return parsed.success ? ok(parsed.output) : err("weather-failed");
  } catch {
    return err("weather-failed");
  }
}
