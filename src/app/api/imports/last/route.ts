import type { NextRequest, NextResponse } from "next/server";
import { savedJson, syncReader } from "@/server/http";
import { lastImport } from "@/server/services";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const display = await syncReader(request);

  if (!display.ok) return display.error;

  return savedJson(await lastImport(display.value.accountId));
}
