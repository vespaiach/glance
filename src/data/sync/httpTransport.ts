import { BUILD_HEADER, CLIENT_BUILD } from "@/domain/build";
import { FILE_NAME_HEADER, uploadProblem } from "@/domain/photoUpload";
import { err, ok, type Result } from "@/domain/result";
import type { Account, Weather, WeatherLocation } from "@/domain/schemas";
import type { OutboxEntry, StoredPhoto } from "../db";
import type {
  AuthStatus,
  Change,
  PullResponse,
  Transport,
  TransportError,
  UploadError,
} from "./transport";

export type HttpTransportOptions = {
  fetch?: typeof globalThis.fetch;
  createXhr?: () => XMLHttpRequest;
};

type Send = <T>(path: string, init?: RequestInit) => Promise<Result<T, TransportError>>;

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

function readJson<T>(text: string): Result<T, TransportError> {
  try {
    return ok(JSON.parse(text) as T);
  } catch {
    return err("server");
  }
}

async function readAnswer<T>(response: Response): Promise<Result<T, TransportError>> {
  if (!response.ok) return err(transportError(response.status));

  if (response.status === 204) return ok(undefined as T);

  return readJson<T>(await response.text());
}

function sender(fetch: typeof globalThis.fetch): Send {
  return async <T>(path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);

    headers.set(BUILD_HEADER, BUILD);

    const response = await fetch(path, { ...init, headers }).catch(() => undefined);

    return response === undefined ? err("network") : readAnswer<T>(response);
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

function percentOf(event: ProgressEvent): number {
  return Math.round((event.loaded / event.total) * 100);
}

function sendFile(
  xhr: XMLHttpRequest,
  file: File,
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
    xhr.setRequestHeader(BUILD_HEADER, BUILD);
    xhr.send(file);
  });
}

function uploadWith(createXhr: () => XMLHttpRequest): Transport["upload"] {
  return async (file, onProgress) => {
    const problem = uploadProblem(file);

    if (problem) return err(problem);

    return sendFile(createXhr(), file, onProgress);
  };
}

export function createHttpTransport({
  fetch = globalThis.fetch.bind(globalThis),
  createXhr = () => new XMLHttpRequest(),
}: HttpTransportOptions = {}): Transport {
  const send = sender(fetch);

  return {
    push: pushWith(send),
    pull: (cursor) => send<PullResponse>(pullPath(cursor)),
    weather: () => send<Weather>("/api/weather"),
    places: (query) =>
      send<WeatherLocation[]>(`/api/weather/places?q=${encodeURIComponent(query)}`),
    auth: {
      link: (request) => send<void>("/api/auth/link", jsonBody("POST", request)),
      status: () => send<AuthStatus>("/api/auth/status"),
      name: (name) => send<Account>("/api/auth/name", jsonBody("POST", { name })),
      signout: () => send<void>("/api/auth/signout", { method: "POST" }),
    },
    upload: uploadWith(createXhr),
  };
}
