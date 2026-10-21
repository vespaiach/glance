import { type NextRequest, NextResponse } from "next/server";
import { TagSchema } from "@/domain/schemas";
import { errorJson, readRow, syncWriter } from "@/server/http";
import { putTag } from "@/server/services";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const display = await syncWriter(request);

  if (!display.ok) return display.error;

  const row = await readRow(request, TagSchema, (await params).id);

  if (!row.ok) return errorJson(row.error, 400);

  const saved = await putTag(display.value.accountId, row.value);

  if (saved.ok) return NextResponse.json(saved.value);

  return errorJson(saved.error, saved.error === "not-found" ? 404 : 409);
}
