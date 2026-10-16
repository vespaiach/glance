import { type NextRequest, NextResponse } from "next/server";
import { syncReader } from "@/server/http";
import { listDisplays } from "@/server/services";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const display = await syncReader(request);

  if (!display.ok) return display.error;

  return NextResponse.json(await listDisplays(display.value.accountId, display.value.displayId));
}
