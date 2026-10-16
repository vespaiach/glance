import { type NextRequest, NextResponse } from "next/server";
import { errorJson, syncReader } from "@/server/http";
import { accountWeather, type WeatherError } from "@/server/services";

export const runtime = "nodejs";

const ERROR_STATUS: Record<WeatherError, number> = { "no-location": 409, "weather-failed": 502 };

export async function GET(request: NextRequest): Promise<NextResponse> {
  const display = await syncReader(request);

  if (!display.ok) return display.error;

  const weather = await accountWeather(display.value.accountId);

  if (!weather.ok) return errorJson(weather.error, ERROR_STATUS[weather.error]);

  return NextResponse.json(weather.value);
}
