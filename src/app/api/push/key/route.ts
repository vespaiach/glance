import { type NextRequest, NextResponse } from "next/server";
import { errorJson, syncReader } from "@/server/http";
import { pushKey } from "@/server/services";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const display = await syncReader(request);

  if (!display.ok) return display.error;

  const key = pushKey();

  return key.ok ? NextResponse.json({ key: key.value }) : errorJson(key.error, 404);
}
