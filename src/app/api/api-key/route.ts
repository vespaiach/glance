import { type NextRequest, NextResponse } from "next/server";
import { errorJson, savedJson, syncReader, syncWriter } from "@/server/http";
import { apiKey, createApiKey, revokeApiKey } from "@/server/services";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const display = await syncReader(request);

  if (!display.ok) return display.error;

  return savedJson(await apiKey(display.value.accountId));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const display = await syncWriter(request);

  if (!display.ok) return display.error;

  const created = await createApiKey(display.value.accountId);

  if (!created.ok) return errorJson(created.error, 409);

  return NextResponse.json(created.value, { status: 201 });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const display = await syncWriter(request);

  if (!display.ok) return display.error;

  const revoked = await revokeApiKey(display.value.accountId);

  if (!revoked.ok) return errorJson(revoked.error, 404);

  return new NextResponse(null, { status: 204 });
}
