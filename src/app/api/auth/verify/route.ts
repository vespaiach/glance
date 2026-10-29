import { type NextRequest, NextResponse } from "next/server";
import { QR_OPENS, type QrOpens } from "@/domain/qrSignIn";
import { LinkVerifySchema } from "@/domain/schemas";
import { appUrl, verifyQrLink } from "@/server/auth";
import { crossOrigin, errorJson, readBody, setCookie } from "@/server/http";

type Opened = { opens?: QrOpens; forDisplay?: string };

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;

  const verified = await verifyQrLink({
    token: searchParams.get("t") ?? "",
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  if (!verified.ok) return NextResponse.redirect(signInUrl("stale"), 303);

  const opened = openedFor(qrOpens(searchParams.get("to")), verified.value.forDisplay);

  const response = NextResponse.redirect(signInUrl("opened", opened), 303);

  setCookie(response, "session", verified.value.sessionToken);

  return response;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const forbidden = crossOrigin(request);

  if (forbidden) return forbidden;

  const body = await readBody(request, LinkVerifySchema);

  if (!body.ok) return errorJson(body.error, 400);

  const verified = await verifyQrLink({
    token: body.value.t,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  if (!verified.ok) return errorJson("link-stale", 400);

  const response = NextResponse.json(verified.value.status);

  setCookie(response, "session", verified.value.sessionToken);

  return response;
}

function qrOpens(to: string | null): QrOpens | undefined {
  return QR_OPENS.find((view) => view === to);
}

function openedFor(opens: QrOpens | undefined, forDisplay: string): Opened {
  return opens === "import" ? { opens, forDisplay } : { opens };
}

function signInUrl(link: "opened" | "stale", { opens, forDisplay }: Opened = {}): URL {
  const url = new URL("/signin", appUrl());

  url.searchParams.set("link", link);

  if (opens) url.searchParams.set("to", opens);

  if (forDisplay) url.searchParams.set("forDisplay", forDisplay);

  return url;
}
