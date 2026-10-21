import { type NextRequest, NextResponse } from "next/server";
import { CodeRequestSchema } from "@/domain/schemas";
import { clientIp, requestCode } from "@/server/auth";
import { crossOrigin, errorJson, readBody } from "@/server/http";

export const runtime = "nodejs";

const FAILURE_STATUS = { "rate-limited": 429, "mail-failed": 502 } as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const forbidden = crossOrigin(request);

  if (forbidden) return forbidden;

  const body = await readBody(request, CodeRequestSchema);

  if (!body.ok) return errorJson(body.error, 400);

  const ip = clientIp(request.headers.get("x-forwarded-for"));

  const sent = await requestCode({ ...body.value, ip });

  if (!sent.ok) return errorJson(sent.error, FAILURE_STATUS[sent.error]);

  return new NextResponse(null, { status: 204 });
}
