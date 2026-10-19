import "server-only";
import { Readable } from "node:stream";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";
import { BUILD_HEADER, isSupportedBuild } from "@/domain/build";
import { FILE_MODIFIED_HEADER, FILE_NAME_HEADER } from "@/domain/photoUpload";
import { err, ok, type Result } from "@/domain/result";
import { IsoDateSchema, WeatherLocationSchema } from "@/domain/schemas";
import { appUrl, isAllowedOrigin, requireDisplay, type SignedInDisplay } from "./auth";
import { PHOTO_VARIANTS, type PhotoUpload, type PhotoVariant } from "./services/photos";
import type { StoredObject } from "./storage/store";
import type { Coordinates } from "./weather/provider";

const MIN_CLIENT_BUILD = 7;

const DAY_S = 24 * 60 * 60;

const MAX_AGE_S = { session: 400 * DAY_S, pending: DAY_S, link_email: 10 * 60 } as const;

export type CookieName = keyof typeof MAX_AGE_S;

const CoordinatesSchema = v.pick(WeatherLocationSchema, ["lat", "lon"]);

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

export function signedInDisplay(
  request: NextRequest,
): Promise<Result<SignedInDisplay, "unauthorized">> {
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

export async function syncWriter(
  request: NextRequest,
): Promise<Result<SignedInDisplay, NextResponse>> {
  const refused = crossOrigin(request);

  if (refused) return err(refused);

  return syncReader(request);
}

export function savedJson<T>(saved: Result<T, "not-found">): NextResponse {
  return saved.ok ? NextResponse.json(saved.value) : errorJson(saved.error, 404);
}

export function readCursor(request: NextRequest): Result<number | undefined, "invalid"> {
  const since = request.nextUrl.searchParams.get("since");

  if (since === null) return ok(undefined);

  return /^\d+$/.test(since) ? ok(Number(since)) : err("invalid");
}

export async function syncReader(
  request: NextRequest,
): Promise<Result<SignedInDisplay, NextResponse>> {
  const refused = outdatedClient(request);

  if (refused) return err(refused);

  const display = await signedInDisplay(request);

  return display.ok ? display : err(errorJson(display.error, 401));
}

export function readPlaceQuery(request: NextRequest): Result<string, "invalid"> {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  return query ? ok(query) : err("invalid");
}

export function readCoordinates(request: NextRequest): Result<Coordinates, "invalid"> {
  const params = request.nextUrl.searchParams;

  const parsed = v.safeParse(CoordinatesSchema, {
    lat: coordinate(params.get("lat")),
    lon: coordinate(params.get("lon")),
  });

  return parsed.success ? ok(parsed.output) : err("invalid");
}

export function readUpload(request: NextRequest): Result<PhotoUpload, "invalid"> {
  const name = decodedName(request.headers.get(FILE_NAME_HEADER));

  if (name === undefined) return err("invalid");

  const modifiedOn = request.headers.get(FILE_MODIFIED_HEADER);

  if (modifiedOn !== null && !v.is(IsoDateSchema, modifiedOn)) return err("invalid");

  const length = request.headers.get("content-length");

  return ok({
    name,
    ...(modifiedOn !== null && { modifiedOn }),
    type: request.headers.get("content-type") ?? "",
    size: length === null ? undefined : Number(length),
    body: request.body ?? Readable.from([]),
  });
}

export function readVariant(request: NextRequest): Result<PhotoVariant, "invalid"> {
  const variant = PHOTO_VARIANTS.find((known) => known === request.nextUrl.searchParams.get("v"));

  return variant ? ok(variant) : err("invalid");
}

export function fileResponse(file: StoredObject): Response {
  return new Response(file.body, {
    headers: {
      "content-type": file.contentType,
      "content-length": String(file.size),
      "cache-control": "private, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

function coordinate(param: string | null): number {
  return param?.trim() ? Number(param) : Number.NaN;
}

function decodedName(header: string | null): string | undefined {
  if (!header) return undefined;

  try {
    return decodeURIComponent(header);
  } catch {
    return undefined;
  }
}
