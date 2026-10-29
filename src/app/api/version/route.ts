import { NextResponse } from "next/server";
import { APP_VERSION } from "@/domain/build";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  return NextResponse.json({ version: APP_VERSION }, { headers: { "Cache-Control": "no-store" } });
}
