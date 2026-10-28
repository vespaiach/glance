import { type NextRequest, NextResponse } from "next/server";
import { errorJson, readCursor, renewSession, syncReader } from "@/server/http";
import { pullChanges } from "@/server/services";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const display = await syncReader(request);

  if (!display.ok) return display.error;

  const since = readCursor(request);

  if (!since.ok) return errorJson(since.error, 400);

  return renewSession(
    request,
    NextResponse.json(await pullChanges(display.value.accountId, since.value)),
  );
}
