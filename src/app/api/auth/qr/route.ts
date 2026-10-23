import { type NextRequest, NextResponse } from "next/server";
import { QrIssueRequestSchema, QrVoidRequestSchema } from "@/domain/schemas";
import { issueQrLink, voidQrLink } from "@/server/auth";
import { errorJson, readBody, syncWriter } from "@/server/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const display = await syncWriter(request);

  if (!display.ok) return display.error;

  const body = await readBody(request, QrIssueRequestSchema);

  if (!body.ok) return errorJson(body.error, 400);

  const issued = await issueQrLink(display.value, body.value.opens);

  return issued.ok ? NextResponse.json(issued.value) : errorJson(issued.error, 429);
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const display = await syncWriter(request);

  if (!display.ok) return display.error;

  const body = await readBody(request, QrVoidRequestSchema);

  if (!body.ok) return errorJson(body.error, 400);

  await voidQrLink(display.value, body.value.url);

  return new NextResponse(null, { status: 204 });
}
