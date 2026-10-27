import { type NextRequest, NextResponse } from "next/server";
import { ClientErrorSchema } from "@/domain/schemas";
import { clientIp } from "@/server/auth";
import { crossOrigin, errorJson, readBody, signedInDisplay } from "@/server/http";
import { logClientError } from "@/server/services";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const forbidden = crossOrigin(request);

  if (forbidden) return forbidden;

  const report = await readBody(request, ClientErrorSchema);

  if (!report.ok) return errorJson(report.error, 400);

  const display = await signedInDisplay(request);

  const sender = display.ok
    ? display.value
    : { ip: clientIp(request.headers.get("x-forwarded-for")) };

  logClientError(sender, report.value);

  return new NextResponse(null, { status: 204 });
}
