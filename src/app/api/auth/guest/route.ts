import { type NextRequest, NextResponse } from "next/server";
import { clientIp, guestAvailable, signInAsGuest } from "@/server/auth";
import { crossOrigin, errorJson, setCookie } from "@/server/http";

export const runtime = "nodejs";

const FAILURE_STATUS = { "not-found": 404, "rate-limited": 429 } as const;

export async function GET(): Promise<NextResponse> {
  const available = await guestAvailable();

  return available ? new NextResponse(null, { status: 204 }) : errorJson("not-found", 404);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const forbidden = crossOrigin(request);

  if (forbidden) return forbidden;

  const signedIn = await signInAsGuest({
    ip: clientIp(request.headers.get("x-forwarded-for")),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  if (!signedIn.ok) return errorJson(signedIn.error, FAILURE_STATUS[signedIn.error]);

  const response = NextResponse.json(signedIn.value.status);

  setCookie(response, "session", signedIn.value.sessionToken);

  return response;
}
