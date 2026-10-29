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

  const ip = clientIp(request.headers.get("x-forwarded-for"));

  const userAgent = request.headers.get("user-agent") ?? undefined;

  logClientError(display.ok ? display.value : { ip }, report.value, { ip, userAgent });

  return new NextResponse(null, { status: 204 });
}
