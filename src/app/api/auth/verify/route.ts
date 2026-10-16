import { type NextRequest, NextResponse } from "next/server";
import { appUrl, verifyLink } from "@/server/auth";
import { clearCookie, setCookie } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("t") ?? "";

  const pendingId = request.cookies.get("pending")?.value;

  const verified = await verifyLink({
    token,
    pendingId,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  const response = NextResponse.redirect(signInUrl(verified.ok ? "opened" : "stale"), 303);

  if (verified.ok) {
    setCookie(response, "session", verified.value.sessionToken);

    if (verified.value.claimedPending) clearCookie(response, "pending");
  } else if (verified.error.email !== null) {
    setCookie(response, "link_email", verified.error.email);
  }

  return response;
}

function signInUrl(link: "opened" | "stale"): URL {
  const url = new URL("/signin", appUrl());

  url.searchParams.set("link", link);

  return url;
}
