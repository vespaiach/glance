import { BUILD_HEADER, CLIENT_BUILD } from "@/domain/build";
import { FILE_MODIFIED_HEADER, FILE_NAME_HEADER, uploadProblem } from "@/domain/photoUpload";
import { err, ok, type Result } from "@/domain/result";
import type { Account, Weather, WeatherLocation } from "@/domain/schemas";
import type { OutboxEntry, StoredPhoto } from "../db";
import type {
  AuthStatus,
  Change,
  Coordinates,
  LocateError,
  PullResponse,
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

function transportError(status: number): TransportError {
  if (status === 401) return "unauthorized";

  if (status === 426) return "outdated";

  return status >= 500 || status === 429 ? "server" : "invalid";
}

function uploadError(status: number): UploadError {
  if (status === 413) return "too-large";

  if (status === 415) return "not-a-photo";

  return transportError(status);
}

function locateError(status: number): LocateError {
  return status === 404 ? "outside" : transportError(status);
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
  toError: (status: number) => E,
): Promise<Result<T, E | TransportError>> {
  if (!response.ok) return err(toError(response.status));

  if (response.status === 204) return ok(undefined as T);

  return readJson<T>(await response.text());
}

function sender<E>(
  fetch: typeof globalThis.fetch,
  toError: (status: number) => E,
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
      resolve(done ? readJson<StoredPhoto>(xhr.responseText) : err(uploadError(xhr.status)));
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

export function createHttpTransport({
  fetch = globalThis.fetch.bind(globalThis),
  createXhr = () => new XMLHttpRequest(),
}: HttpTransportOptions = {}): Transport {
  const send = sender(fetch, transportError);

  const sendLocate = sender(fetch, locateError);

  return {
    push: pushWith(send),
    pull: (cursor) => send<PullResponse>(pullPath(cursor)),
    weather: () => send<Weather>("/api/weather"),
    places: (query) =>
      send<WeatherLocation[]>(`/api/weather/places?q=${encodeURIComponent(query)}`),
    locate: (position) => sendLocate<WeatherLocation>(locatePath(position)),
    auth: {
      link: (request) => send<void>("/api/auth/link", jsonBody("POST", request)),
      status: () => send<AuthStatus>("/api/auth/status"),
      name: (name) => send<Account>("/api/auth/name", jsonBody("POST", { name })),
      location: (request) => send<void>("/api/auth/location", jsonBody("POST", request)),
      signout: () => send<void>("/api/auth/signout", { method: "POST" }),
    },
    upload: uploadWith(createXhr),
  };
}
