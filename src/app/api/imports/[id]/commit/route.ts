import { type NextRequest, NextResponse } from "next/server";
import { ImportCommitSchema } from "@/domain/schemas";
import { errorJson, readBody, syncWriter } from "@/server/http";
import { commitImport } from "@/server/services";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

const STATUS = { "not-found": 404, "not-staged": 409, "unknown-tag": 400 } as const;

export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const display = await syncWriter(request);

  if (!display.ok) return display.error;

  const body = await readBody(request, ImportCommitSchema);

  if (!body.ok) return errorJson(body.error, 400);

  const done = await commitImport(display.value.accountId, (await params).id, body.value.who);

  if (!done.ok) return errorJson(done.error, STATUS[done.error]);

  const { version: _, ...result } = done.value;

  return NextResponse.json(result);
}
