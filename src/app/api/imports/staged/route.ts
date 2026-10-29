import type { NextRequest, NextResponse } from "next/server";
import { savedJson, syncReader } from "@/server/http";
import { stagedImport } from "@/server/services";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const display = await syncReader(request);

  if (!display.ok) return display.error;

  return savedJson(await stagedImport(display.value.accountId, display.value.displayId));
}
