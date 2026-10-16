import type { NextRequest, NextResponse } from "next/server";
import { AccountSettingsSchema } from "@/domain/schemas";
import { errorJson, readBody, savedJson, syncWriter } from "@/server/http";
import { putSettings } from "@/server/services";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const display = await syncWriter(request);

  if (!display.ok) return display.error;

  const body = await readBody(request, AccountSettingsSchema);

  if (!body.ok) return errorJson(body.error, 400);

  return savedJson(await putSettings(display.value.accountId, (await params).id, body.value));
}
