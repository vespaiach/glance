import type { NextRequest, NextResponse } from "next/server";
import { CalendarEventSchema } from "@/domain/schemas";
import { errorJson, readRow, savedJson, syncWriter } from "@/server/http";
import { deleteEvent, putEvent } from "@/server/services";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const display = await syncWriter(request);

  if (!display.ok) return display.error;

  const row = await readRow(request, CalendarEventSchema, (await params).id);

  if (!row.ok) return errorJson(row.error, 400);

  return savedJson(await putEvent(display.value.accountId, row.value));
}

export async function DELETE(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const display = await syncWriter(request);

  if (!display.ok) return display.error;

  return savedJson(await deleteEvent(display.value.accountId, (await params).id));
}
