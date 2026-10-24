import { type NextRequest, NextResponse } from "next/server";
import { PushSubscriptionSchema } from "@/domain/schemas";
import { errorJson, readBody, syncWriter } from "@/server/http";
import { subscribePush, unsubscribePush } from "@/server/services";

export const runtime = "nodejs";

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const display = await syncWriter(request);

  if (!display.ok) return display.error;

  const subscription = await readBody(request, PushSubscriptionSchema);

  if (!subscription.ok) return errorJson(subscription.error, 400);

  await subscribePush(display.value.accountId, display.value.displayId, subscription.value);

  return new NextResponse(null, { status: 204 });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const display = await syncWriter(request);

  if (!display.ok) return display.error;

  await unsubscribePush(display.value.accountId, display.value.displayId);

  return new NextResponse(null, { status: 204 });
}
