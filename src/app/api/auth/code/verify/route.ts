import { type NextRequest, NextResponse } from "next/server";
import { CodeVerifySchema } from "@/domain/schemas";
import { clientIp, verifyCode } from "@/server/auth";
import { crossOrigin, errorJson, readBody, setCookie } from "@/server/http";

export const runtime = "nodejs";

const FAILURE_STATUS = {
  "wrong-code": 400,
  "code-locked": 400,
  "code-expired": 400,
  "rate-limited": 429,
} as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const forbidden = crossOrigin(request);

  if (forbidden) return forbidden;

  const body = await readBody(request, CodeVerifySchema);

  if (!body.ok) return errorJson(body.error, 400);

  const verified = await verifyCode({
    ...body.value,
    ip: clientIp(request.headers.get("x-forwarded-for")),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  if (!verified.ok) return errorJson(verified.error, FAILURE_STATUS[verified.error]);

  const response = NextResponse.json(verified.value.status);

  setCookie(response, "session", verified.value.sessionToken);

  return response;
}
