import { type NextRequest, NextResponse } from "next/server";
import { ApiEventInputSchema } from "@/domain/schemas";
import { apiAccount, errorJson, invalidField, readApiBody, readApiRange } from "@/server/http";
import { createApiEvent, listApiEvents } from "@/server/services";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const account = await apiAccount(request);

  if (!account.ok) return account.error;

  const range = readApiRange(request);

  if (!range.ok) return errorJson(range.error, 400);

  return NextResponse.json({ events: await listApiEvents(account.value, range.value) });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const account = await apiAccount(request);

  if (!account.ok) return account.error;

  const input = await readApiBody(request, ApiEventInputSchema);

  if (!input.ok) return input.error;

  const created = await createApiEvent(account.value, input.value);

  if (!created.ok) return invalidField(created.error);

  return NextResponse.json(created.value.event, { status: 201 });
}
