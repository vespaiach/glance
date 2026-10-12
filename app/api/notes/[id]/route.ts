import type { NextRequest, NextResponse } from "next/server";
import { NoteSchema } from "@/domain/schemas";
import { errorJson, readRow, savedJson, syncWriter } from "@/server/http";
import { deleteNote, putNote } from "@/server/services";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const display = syncWriter(request);

  if (!display.ok) return display.error;

  const row = await readRow(request, NoteSchema, (await params).id);

  if (!row.ok) return errorJson(row.error, 400);

  return savedJson(putNote(display.value.accountId, row.value));
}

export async function DELETE(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const display = syncWriter(request);

  if (!display.ok) return display.error;

  return savedJson(deleteNote(display.value.accountId, (await params).id));
}
