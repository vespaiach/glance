import { type NextRequest, NextResponse } from "next/server";
import { errorJson, readPlaceQuery, syncReader } from "@/server/http";
import { searchPlaces } from "@/server/services";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const display = syncReader(request);

  if (!display.ok) return display.error;

  const query = readPlaceQuery(request);

  if (!query.ok) return errorJson(query.error, 400);

  const places = await searchPlaces(query.value);

  if (!places.ok) return errorJson(places.error, 502);

  return NextResponse.json(places.value);
}
