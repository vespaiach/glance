import { type NextRequest, NextResponse } from "next/server";
import { errorJson, readIcsUpload, syncWriter } from "@/server/http";
import { stageImport } from "@/server/services";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const display = await syncWriter(request);

  if (!display.ok) return display.error;

  const upload = await readIcsUpload(request);

  if (!upload.ok) return errorJson(upload.error, upload.error === "too-large" ? 413 : 400);

  const { accountId, displayId } = display.value;

  const review = await stageImport(accountId, displayId, upload.value);

  if (!review.ok) return errorJson(review.error, review.error === "not-found" ? 404 : 400);

  return NextResponse.json(review.value, { status: 201 });
}
