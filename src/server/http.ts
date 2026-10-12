import "server-only";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";
import { BUILD_HEADER, isSupportedBuild } from "@/domain/build";
import { err, ok, type Result } from "@/domain/result";
import { appUrl, isAllowedOrigin, requireDisplay, type SignedInDisplay } from "./auth";

const MIN_CLIENT_BUILD = 1;

const DAY_S = 24 * 60 * 60;

const MAX_AGE_S = { session: 400 * DAY_S, pending: DAY_S, link_email: 10 * 60 } as const;

export type CookieName = keyof typeof MAX_AGE_S;

export function setCookie(response: NextResponse, name: CookieName, value: string): void {
  response.cookies.set(name, value, {
    httpOnly: true,
    secure: appUrl().startsWith("https:"),
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S[name],
  });
}

export function clearCookie(response: NextResponse, name: CookieName): void {
  response.cookies.delete(name);
}

export function errorJson(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

export function crossOrigin(request: NextRequest): NextResponse | undefined {
  if (isAllowedOrigin(request.headers.get("origin"), appUrl())) return undefined;

  return errorJson("forbidden", 403);
}

export function outdatedClient(request: NextRequest): NextResponse | undefined {
  if (isSupportedBuild(request.headers.get(BUILD_HEADER), MIN_CLIENT_BUILD)) return undefined;

  return errorJson("outdated", 426);
}

export function signedInDisplay(request: NextRequest): Result<SignedInDisplay, "unauthorized"> {
  return requireDisplay(request.cookies.get("session")?.value);
}

export async function readBody<T>(
  request: NextRequest,
  schema: v.GenericSchema<unknown, T>,
): Promise<Result<T, "invalid">> {
  const body = await request.json().catch(() => undefined);

  const parsed = v.safeParse(schema, body);

  return parsed.success ? ok(parsed.output) : err("invalid");
}

export async function readRow<T extends { id: string }>(
  request: NextRequest,
  schema: v.GenericSchema<unknown, T>,
  id: string,
): Promise<Result<T, "invalid">> {
  const body = await readBody(request, schema);

  if (body.ok && body.value.id !== id) return err("invalid");

  return body;
}

export function syncWriter(request: NextRequest): Result<SignedInDisplay, NextResponse> {
  const refused = crossOrigin(request) ?? outdatedClient(request);

  if (refused) return err(refused);

  const display = signedInDisplay(request);

  return display.ok ? display : err(errorJson(display.error, 401));
}

export function savedJson<T>(saved: Result<T, "not-found">): NextResponse {
  return saved.ok ? NextResponse.json(saved.value) : errorJson(saved.error, 404);
}
