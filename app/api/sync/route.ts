import { type NextRequest, NextResponse } from "next/server";
import { errorJson, readCursor, syncReader } from "@/server/http";
import { pullChanges } from "@/server/services";

export const runtime = "nodejs";

export function GET(request: NextRequest): NextResponse {
  const display = syncReader(request);

  if (!display.ok) return display.error;

  const since = readCursor(request);

  if (!since.ok) return errorJson(since.error, 400);

  return NextResponse.json(pullChanges(display.value.accountId, since.value));
}
