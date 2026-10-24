import { type NextRequest, NextResponse } from "next/server";
import { deleteAccount } from "@/server/auth";
import { clearCookie, crossOrigin, errorJson, signedInDisplay } from "@/server/http";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const forbidden = crossOrigin(request);

  if (forbidden) return forbidden;

  const display = await signedInDisplay(request);

  if (!display.ok) return errorJson(display.error, 401);

  await deleteAccount(display.value.accountId);

  const response = new NextResponse(null, { status: 204 });

  clearCookie(response, "session");

  return response;
}
