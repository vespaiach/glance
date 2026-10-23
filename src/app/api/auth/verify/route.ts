import { type NextRequest, NextResponse } from "next/server";
import { QR_OPENS, type QrOpens } from "@/domain/qrSignIn";
import { appUrl, verifyQrLink } from "@/server/auth";
import { setCookie } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;

  const verified = await verifyQrLink({
    token: searchParams.get("t") ?? "",
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  const opens = verified.ok ? qrOpens(searchParams.get("to")) : undefined;

  const response = NextResponse.redirect(signInUrl(verified.ok ? "opened" : "stale", opens), 303);

  if (verified.ok) setCookie(response, "session", verified.value.sessionToken);

  return response;
}

function qrOpens(to: string | null): QrOpens | undefined {
  return QR_OPENS.find((view) => view === to);
}

function signInUrl(link: "opened" | "stale", opens: QrOpens | undefined): URL {
  const url = new URL("/signin", appUrl());

  url.searchParams.set("link", link);

  if (opens) url.searchParams.set("to", opens);

  return url;
}
