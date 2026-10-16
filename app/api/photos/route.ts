import { type NextRequest, NextResponse } from "next/server";
import type { UploadProblem } from "@/domain/photoUpload";
import { errorJson, readUpload, syncWriter } from "@/server/http";
import { uploadPhoto } from "@/server/services";

export const runtime = "nodejs";

const PROBLEM_STATUS: Record<UploadProblem, number> = { "too-large": 413, "not-a-photo": 415 };

export async function POST(request: NextRequest): Promise<NextResponse> {
  const display = await syncWriter(request);

  if (!display.ok) return display.error;

  const upload = readUpload(request);

  if (!upload.ok) return errorJson(upload.error, 400);

  const saved = await uploadPhoto(display.value.accountId, upload.value);

  if (!saved.ok) return errorJson(saved.error, PROBLEM_STATUS[saved.error]);

  return NextResponse.json(saved.value, { status: 201 });
}
