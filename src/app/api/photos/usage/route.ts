import { type NextRequest, NextResponse } from "next/server";
import { syncReader } from "@/server/http";
import { photoUsage } from "@/server/services";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const display = await syncReader(request);

  if (!display.ok) return display.error;

  return NextResponse.json(await photoUsage(display.value.accountId));
}
