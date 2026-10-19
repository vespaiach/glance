import { type NextRequest, NextResponse } from "next/server";
import { MemberSchema } from "@/domain/schemas";
import { errorJson, readRow, savedJson, syncWriter } from "@/server/http";
import { deleteMember, putMember } from "@/server/services";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const display = await syncWriter(request);

  if (!display.ok) return display.error;

  const row = await readRow(request, MemberSchema, (await params).id);

  if (!row.ok) return errorJson(row.error, 400);

  const saved = await putMember(display.value.accountId, row.value);

  if (saved.ok) return NextResponse.json(saved.value);

  return errorJson(saved.error, saved.error === "name-taken" ? 409 : 404);
}

export async function DELETE(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const display = await syncWriter(request);

  if (!display.ok) return display.error;

  return savedJson(await deleteMember(display.value.accountId, (await params).id));
}
