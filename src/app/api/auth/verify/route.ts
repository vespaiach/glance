import { type NextRequest, NextResponse } from "next/server";
import { appUrl, verifyQrLink } from "@/server/auth";
import { setCookie } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const verified = await verifyQrLink({
    token: request.nextUrl.searchParams.get("t") ?? "",
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  const response = NextResponse.redirect(signInUrl(verified.ok ? "opened" : "stale"), 303);

  if (verified.ok) setCookie(response, "session", verified.value.sessionToken);

  return response;
}

function signInUrl(link: "opened" | "stale"): URL {
  const url = new URL("/signin", appUrl());

  url.searchParams.set("link", link);

  return url;
}
