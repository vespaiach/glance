import type { NextRequest } from "next/server";
import { syncBus } from "@/server/bus";
import { errorJson, signedInDisplay } from "@/server/http";
import { SSE_HEADERS, syncStream } from "@/server/sse";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  const display = await signedInDisplay(request);

  if (!display.ok) return errorJson(display.error, 401);

  const stream = syncStream(syncBus(), display.value.accountId, request.signal);

  return new Response(stream, { headers: SSE_HEADERS });
}
