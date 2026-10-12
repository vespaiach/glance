import { type NextRequest, NextResponse } from "next/server";
import { LinkRequestSchema } from "@/domain/schemas";
import { clientIp, requestLink } from "@/server/auth";
import { crossOrigin, errorJson, readBody, setCookie } from "@/server/http";

export const runtime = "nodejs";

const FAILURE_STATUS = { "rate-limited": 429, "mail-failed": 502 } as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const forbidden = crossOrigin(request);

  if (forbidden) return forbidden;

  const body = await readBody(request, LinkRequestSchema);

  if (!body.ok) return errorJson(body.error, 400);

  const ip = clientIp(request.headers.get("x-forwarded-for"));

  const sent = await requestLink({ ...body.value, ip });

  if (!sent.ok) return errorJson(sent.error, FAILURE_STATUS[sent.error]);

  const response = new NextResponse(null, { status: 204 });

  setCookie(response, "pending", sent.value.pendingId);

  return response;
}
