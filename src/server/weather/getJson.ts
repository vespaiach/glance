import "server-only";
import * as v from "valibot";
import { err, ok, type Result } from "@/domain/result";
import { logError } from "../log";
import type { WeatherFailure } from "./provider";

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const TIMEOUT_MS = 8_000;

export async function getJson<T>(
  fetchFn: Fetch,
  url: string,
  schema: v.GenericSchema<unknown, T>,
): Promise<Result<T, WeatherFailure>> {
  const host = new URL(url).host;

  try {
    const response = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

    if (!response.ok) return badStatus(host, response.status);

    const parsed = v.safeParse(schema, await response.json());

    return parsed.success ? ok(parsed.output) : badBody(url, parsed.issues);
  } catch (error) {
    logError("weather", "fetch-failed", error, { host });

    return err("weather-failed");
  }
}

export function badBody(url: string, issues: readonly v.BaseIssue<unknown>[]) {
  const paths = issues.map((issue) => v.getDotPath(issue) ?? "(root)");

  return badResponse(url, `bad body at ${paths.join(", ")}`);
}

export function badResponse(url: string, message: string) {
  logError("weather", "bad-response", new Error(message), { host: new URL(url).host });

  return err("weather-failed" as const);
}

function badStatus(host: string, status: number) {
  logError("weather", "bad-status", new Error(`status ${status}`), { host, status });

  return err("weather-failed" as const);
}
