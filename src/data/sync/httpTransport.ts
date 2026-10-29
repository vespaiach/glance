import { BUILD_HEADER, CLIENT_BUILD } from "@/domain/build";
import type { ImportResult, ImportReview, LastImport } from "@/domain/imports";
import { FILE_MODIFIED_HEADER, FILE_NAME_HEADER, uploadProblem } from "@/domain/photoUpload";
import { err, ok, type Result } from "@/domain/result";
import type { Account, Weather, WeatherLocation } from "@/domain/schemas";
import type { SignedInScreen } from "@/domain/screens";
import type { PhotoUsage } from "@/domain/storage";
import type { OutboxEntry, StoredPhoto } from "../db";
import type {
  AuthStatus,
  Change,
  CodeError,
  Coordinates,
  ImportError,
  LocateError,
  PullResponse,
  QrCode,
  SignedIn,
  Transport,
  TransportError,
  UploadError,
} from "./transport";

export type HttpTransportOptions = {
  fetch?: typeof globalThis.fetch;
  createXhr?: () => XMLHttpRequest;
};

type Send<E = TransportError> = <T>(path: string, init?: RequestInit) => Promise<Result<T, E>>;

const BUILD = String(CLIENT_BUILD);

const JSON_TYPE = "application/json";

const CODE_ERRORS: readonly string[] = ["wrong-code", "code-locked", "code-expired"];

const ICS_ERRORS: readonly string[] = ["not-ics", "no-upcoming"];

export function createHttpTransport({
  fetch = globalThis.fetch.bind(globalThis),
  createXhr = () => new XMLHttpRequest(),
}: HttpTransportOptions = {}): Transport {
  const send = sender(fetch, transportError);

  const sendLocate = sender(fetch, locateError);

  const sendImport = sender(fetch, importError);

  const sendStaged = sender(fetch, stagedError);

  return {
    push: pushWith(send),
    pull: (cursor) => send<PullResponse>(pullPath(cursor)),
    weather: () => send<Weather>("/api/weather"),
    places: (query) =>
      send<WeatherLocation[]>(`/api/weather/places?q=${encodeURIComponent(query)}`),
    locate: (position) => sendLocate<WeatherLocation>(locatePath(position)),
    displays: () => send<SignedInScreen[]>("/api/displays"),
    photoUsage: () => send<PhotoUsage>("/api/photos/usage"),
    issueQr: (opens) =>
      send<QrCode>("/api/auth/qr", opens ? jsonBody("POST", { opens }) : { method: "POST" }),
    voidQr: (url) => send<void>("/api/auth/qr", jsonBody("DELETE", { url })),
    imports: {
      upload: (file, forDisplay) =>
        sendImport<ImportReview>(importPath(forDisplay), fileBody(file)),
      staged: () => orNothing(sendStaged<ImportReview>("/api/imports/staged")),
      commit: (id, who) =>
        send<ImportResult>(
          `/api/imports/${encodeURIComponent(id)}/commit`,
          jsonBody("POST", { who }),
        ),
      last: () => orNothing(sendStaged<LastImport>("/api/imports/last")),
      undo: (id) => send<void>(`/api/imports/${encodeURIComponent(id)}/undo`, { method: "POST" }),
    },
    webPush: {
      key: async () => {
        const answer = await send<{ key: string }>("/api/push/key");

        return answer.ok ? ok(answer.value.key) : answer;
      },
      subscribe: (subscription) =>
        send<void>("/api/push/subscription", jsonBody("PUT", subscription)),
      unsubscribe: () => send<void>("/api/push/subscription", { method: "DELETE" }),
    },
    auth: {
      sendCode: (request) => send<void>("/api/auth/code", jsonBody("POST", request)),
      verifyCode: verifyCodeWith(fetch),
      verifyLink: (t) => send<SignedIn>("/api/auth/verify", jsonBody("POST", { t })),
      status: () => send<AuthStatus>("/api/auth/status"),
      name: (name) => send<Account>("/api/auth/name", jsonBody("POST", { name })),
      location: (request) => send<void>("/api/auth/location", jsonBody("POST", request)),
      signout: () => send<void>("/api/auth/signout", { method: "POST" }),
      signoutAll: () => send<void>("/api/auth/signout-all", { method: "POST" }),
      deleteAccount: () => send<void>("/api/account", { method: "DELETE" }),
    },
    upload: uploadWith(createXhr),
  };
}

function transportError(status: number, body: string): TransportError {
  if (status === 401) return isRevoked(body) ? "revoked" : "unauthorized";

  if (status === 426) return "outdated";

  return status >= 500 || status === 429 || status === 403 ? "server" : "invalid";
}

function isRevoked(body: string): boolean {
  const answer = readJson<{ error?: unknown }>(body);

  return answer.ok && answer.value?.error === "revoked";
}

function uploadError(status: number, body: string): UploadError {
  if (status === 413) return "too-large";

  if (status === 415) return "not-a-photo";

  if (status === 507) return "storage-full";

  return transportError(status, body);
}

function importError(status: number, body: string): ImportError {
  if (status === 413) return "too-large";

  const answer = readJson<{ error?: unknown }>(body);

  const error = answer.ok ? String(answer.value?.error) : "";

  if (status === 400 && ICS_ERRORS.includes(error)) return error as ImportError;

  return transportError(status, body);
}

async function orNothing<T>(
  sent: Promise<Result<T, TransportError | "not-found">>,
): Promise<Result<T | undefined, TransportError>> {
  const answer = await sent;

  if (answer.ok) return answer;

  return answer.error === "not-found" ? ok(undefined) : err(answer.error);
}

function stagedError(status: number, body: string): TransportError | "not-found" {
  return status === 404 ? "not-found" : transportError(status, body);
}

function locateError(status: number, body: string): LocateError {
  return status === 404 ? "outside" : transportError(status, body);
}

function readJson<T>(text: string): Result<T, TransportError> {
  try {
    return ok(JSON.parse(text) as T);
  } catch {
    return err("server");
  }
}

async function readAnswer<T, E>(
  response: Response,
  toError: (status: number, body: string) => E,
): Promise<Result<T, E | TransportError>> {
  if (!response.ok) return err(toError(response.status, await response.text()));

  if (response.status === 204) return ok(undefined as T);

  return readJson<T>(await response.text());
}

function sender<E>(
  fetch: typeof globalThis.fetch,
  toError: (status: number, body: string) => E,
): Send<E | TransportError> {
  return async <T>(path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);

    headers.set(BUILD_HEADER, BUILD);

    const response = await fetch(path, { ...init, headers }).catch(() => undefined);

    return response === undefined ? err("network") : readAnswer<T, E>(response, toError);
  };
}

function jsonBody(method: string, body: unknown): RequestInit {
  return { method, headers: { "content-type": JSON_TYPE }, body: JSON.stringify(body) };
}

function fileBody(file: File): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": file.type, [FILE_NAME_HEADER]: encodeURIComponent(file.name) },
    body: file,
  };
}

function importPath(forDisplay: string | undefined): string {
  return forDisplay === undefined
    ? "/api/imports"
    : `/api/imports?forDisplay=${encodeURIComponent(forDisplay)}`;
}

function verifyCodeWith(fetch: typeof globalThis.fetch): Transport["auth"]["verifyCode"] {
  return async (request) => {
    const response = await fetch("/api/auth/code/verify", {
      ...jsonBody("POST", request),
      headers: { "content-type": JSON_TYPE, [BUILD_HEADER]: BUILD },
    }).catch(() => undefined);

    if (response === undefined) return err("network");

    if (response.status === 400) return err(await codeError(response));

    return readAnswer<SignedIn, TransportError>(response, transportError);
  };
}

async function codeError(response: Response): Promise<CodeError | TransportError> {
  const body = (await response.json().catch(() => undefined)) as { error?: string } | undefined;

  const error = body?.error ?? "";

  return CODE_ERRORS.includes(error) ? (error as CodeError) : "invalid";
}

function pushRequest(entry: OutboxEntry): RequestInit {
  return entry.op === "delete" ? { method: "DELETE" } : jsonBody("PUT", entry.payload);
}

function pushWith(send: Send): Transport["push"] {
  return async (entry) => {
    const saved = await send<Change["row"]>(
      `/api/${entry.entity}/${entry.entityId}`,
      pushRequest(entry),
    );

    return saved.ok ? ok({ entity: entry.entity, row: saved.value } as Change) : saved;
  };
}

function pullPath(cursor: string | undefined): string {
  return cursor === undefined ? "/api/sync" : `/api/sync?since=${encodeURIComponent(cursor)}`;
}

function locatePath({ lat, lon }: Coordinates): string {
  return `/api/weather/locate?${new URLSearchParams({ lat: String(lat), lon: String(lon) })}`;
}

function percentOf(event: ProgressEvent): number {
  return Math.round((event.loaded / event.total) * 100);
}

function sendFile(
  xhr: XMLHttpRequest,
  file: File,
  modifiedOn: string,
  onProgress: (percent: number) => void,
): Promise<Result<StoredPhoto, UploadError>> {
  return new Promise((resolve) => {
    const failed = () => resolve(err("network"));

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(percentOf(event));
    };
    xhr.onload = () => {
      const done = xhr.status >= 200 && xhr.status < 300;
      resolve(
        done
          ? readJson<StoredPhoto>(xhr.responseText)
          : err(uploadError(xhr.status, xhr.responseText)),
      );
    };
    xhr.onerror = failed;
    xhr.onabort = failed;
    xhr.ontimeout = failed;

    xhr.open("POST", "/api/photos");
    xhr.setRequestHeader("content-type", file.type);
    xhr.setRequestHeader(FILE_NAME_HEADER, encodeURIComponent(file.name));
    xhr.setRequestHeader(FILE_MODIFIED_HEADER, modifiedOn);
    xhr.setRequestHeader(BUILD_HEADER, BUILD);
    xhr.send(file);
  });
}

function uploadWith(createXhr: () => XMLHttpRequest): Transport["upload"] {
  return async (file, modifiedOn, onProgress) => {
    const problem = uploadProblem(file);

    if (problem) return err(problem);

    return sendFile(createXhr(), file, modifiedOn, onProgress);
  };
}
