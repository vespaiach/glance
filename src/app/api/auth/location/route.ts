import { type NextRequest, NextResponse } from "next/server";
import { LocationRequestSchema } from "@/domain/schemas";
import { errorJson, readBody, syncWriter } from "@/server/http";
import { finishLocationStep } from "@/server/services";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const display = await syncWriter(request);

  if (!display.ok) return display.error;

  const body = await readBody(request, LocationRequestSchema);

  if (!body.ok) return errorJson(body.error, 400);

  await finishLocationStep(display.value.accountId, body.value);

  return new NextResponse(null, { status: 204 });
}
