import { type NextRequest, NextResponse } from "next/server";
import { errorJson, readCoordinates, syncReader } from "@/server/http";
import { locatePlace } from "@/server/services";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const display = syncReader(request);

  if (!display.ok) return display.error;

  const position = readCoordinates(request);

  if (!position.ok) return errorJson(position.error, 400);

  const place = await locatePlace(position.value);

  if (!place.ok) return errorJson(place.error, place.error === "not-found" ? 404 : 502);

  return NextResponse.json(place.value);
}
