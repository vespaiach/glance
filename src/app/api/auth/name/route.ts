import { type NextRequest, NextResponse } from "next/server";
import { NameRequestSchema } from "@/domain/schemas";
import { saveName } from "@/server/auth";
import { crossOrigin, errorJson, readBody, signedInDisplay } from "@/server/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const forbidden = crossOrigin(request);

  if (forbidden) return forbidden;

  const display = await signedInDisplay(request);

  if (!display.ok) return errorJson(display.error, 401);

  const body = await readBody(request, NameRequestSchema);

  if (!body.ok) return errorJson(body.error, 400);

  const saved = await saveName(display.value.accountId, body.value.name);

  return saved.ok ? NextResponse.json(saved.value) : errorJson(saved.error, 404);
}
