import type { NextRequest } from "next/server";
import { errorJson, fileResponse, readVariant, signedInDisplay } from "@/server/http";
import { photoFile } from "@/server/services";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context): Promise<Response> {
  const display = await signedInDisplay(request);

  if (!display.ok) return errorJson(display.error, 401);

  const variant = readVariant(request);

  if (!variant.ok) return errorJson(variant.error, 400);

  const file = await photoFile(display.value.accountId, (await params).id, variant.value);

  return file.ok ? fileResponse(file.value) : errorJson(file.error, 404);
}
