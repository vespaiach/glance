import { type NextRequest, NextResponse } from "next/server";
import { errorJson, syncWriter } from "@/server/http";
import { undoImport } from "@/server/services";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const display = await syncWriter(request);

  if (!display.ok) return display.error;

  const undone = await undoImport(display.value.accountId, (await params).id);

  if (!undone.ok) return errorJson(undone.error, undone.error === "not-found" ? 404 : 409);

  return new NextResponse(null, { status: 204 });
}
