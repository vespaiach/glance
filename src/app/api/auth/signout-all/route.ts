import { type NextRequest, NextResponse } from "next/server";
import { signOutAll } from "@/server/auth";
import { clearCookie, crossOrigin, errorJson, signedInDisplay } from "@/server/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const forbidden = crossOrigin(request);

  if (forbidden) return forbidden;

  const display = await signedInDisplay(request);

  if (!display.ok) return errorJson(display.error, 401);

  await signOutAll(display.value.accountId);

  const response = new NextResponse(null, { status: 204 });

  clearCookie(response, "session");

  return response;
}
