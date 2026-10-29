import { type NextRequest, NextResponse } from "next/server";
import { ApiEventPatchSchema } from "@/domain/schemas";
import { apiAccount, errorJson, invalidField, readApiBody, savedJson } from "@/server/http";
import { changeApiEvent, deleteApiEvent, readApiEvent } from "@/server/services";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const account = await apiAccount(request);

  if (!account.ok) return account.error;

  return savedJson(await readApiEvent(account.value, (await params).id));
}

export async function PATCH(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const account = await apiAccount(request);

  if (!account.ok) return account.error;

  const patch = await readApiBody(request, ApiEventPatchSchema);

  if (!patch.ok) return patch.error;

  const changed = await changeApiEvent(account.value, (await params).id, patch.value);

  if (changed.ok) return NextResponse.json(changed.value.event);

  return changed.error === "not-found" ? errorJson("not-found", 404) : invalidField(changed.error);
}

export async function DELETE(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const account = await apiAccount(request);

  if (!account.ok) return account.error;

  const deleted = await deleteApiEvent(account.value, (await params).id);

  if (!deleted.ok) return errorJson(deleted.error, 404);

  return new NextResponse(null, { status: 204 });
}
