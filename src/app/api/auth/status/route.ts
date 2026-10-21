import { type NextRequest, NextResponse } from "next/server";
import { authStatus } from "@/server/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json(await authStatus(request.cookies.get("session")?.value));
}
