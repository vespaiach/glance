import "server-only";

type LogEvents = {
  route: "request-failed";
  job: "job-failed" | "cleanup-failed";
  boot: "start-failed";
  db: "pool-error" | "rollback-failed";
  mail: "send-failed";
  weather: "fetch-failed" | "bad-status" | "bad-response";
  push: "send-failed";
  storage: "remove-failed";
  photos: "decode-failed";
  client:
    | "zone-crashed"
    | "page-crashed"
    | "uncaught"
    | "worker-crashed"
    | "outbox-watch-failed"
    | "sw-crashed";
};

export type LogSource = keyof LogEvents;

export type LogContext = {
  method?: string;
  route?: string;
  job?: string;
  provider?: string;
  host?: string;
  status?: number;
  accountId?: string;
  photoId?: string;
  displayId?: string;
  page?: string;
  build?: number;
  component?: string;
  digest?: string;
};

type LoggedError = {
  name: string;
  message: string;
  code?: string | number;
  stack?: string;
  cause?: LoggedError;
};

type ErrorLike = {
  message: unknown;
  name?: unknown;
  code?: unknown;
  stack?: unknown;
  cause?: unknown;
};

const MAX_MESSAGE = 500;

const MAX_CAUSES = 2;

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/gi;

export function logError<S extends LogSource>(
  source: S,
  event: LogEvents[S],
  error: unknown,
  context: LogContext = {},
): void {
  const line = {
    level: "error",
    time: new Date().toISOString(),
    source,
    event,
    ...context,
    error: loggedError(error, 0),
  };

  console.error(JSON.stringify(line));
}

function loggedError(error: unknown, depth: number): LoggedError {
  const fields: ErrorLike = isErrorLike(error) ? error : { message: String(error) };

  const { name, code, stack, cause } = fields;

  return {
    name: typeof name === "string" ? name : "Error",
    message: masked(String(fields.message)).slice(0, MAX_MESSAGE),
    ...((typeof code === "string" || typeof code === "number") && { code }),
    ...(typeof stack === "string" && { stack: masked(stack) }),
    ...(depth < MAX_CAUSES && cause !== undefined && { cause: loggedError(cause, depth + 1) }),
  };
}

function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === "object" && value !== null && "message" in value;
}

function masked(text: string): string {
  return text.replace(EMAIL, "[email]");
}
