import { type NextRequest, NextResponse } from "next/server";
import { signOut } from "@/server/auth";
import { clearCookie, crossOrigin } from "@/server/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const forbidden = crossOrigin(request);

  if (forbidden) return forbidden;

  await signOut(request.cookies.get("session")?.value);

  const response = new NextResponse(null, { status: 204 });

  clearCookie(response, "session");

  return response;
}
