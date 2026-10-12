import { type NextRequest, NextResponse } from "next/server";
import { authStatus } from "@/server/auth";
import { clearCookie, setCookie } from "@/server/http";

export const runtime = "nodejs";

export function GET(request: NextRequest): NextResponse {
  const answer = authStatus({
    sessionToken: request.cookies.get("session")?.value,
    pendingId: request.cookies.get("pending")?.value,
    linkEmail: request.cookies.get("link_email")?.value,
  });

  const response = NextResponse.json(answer.status);

  if (answer.sessionToken) setCookie(response, "session", answer.sessionToken);

  if (answer.status.state === "signed-in") {
    clearCookie(response, "pending");
    clearCookie(response, "link_email");
  }

  return response;
}
