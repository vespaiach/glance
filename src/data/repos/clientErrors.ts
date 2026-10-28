import { CLIENT_BUILD } from "@/domain/build";
import { CLIENT_ERROR_LIMITS, type ClientError, type ClientErrorEvent } from "@/domain/schemas";

export type ReportExtra = { component?: string };

export type ReportError = (event: ClientErrorEvent, error: unknown, extra?: ReportExtra) => void;

export type ErrorReporterDeps = {
  fetch?: typeof globalThis.fetch;
  events?: EventTarget;
  online?: () => boolean;
  page?: () => string;
};

const PATH = "/api/client-errors";

const MAX_REPORTS = 20;

export function createErrorReporter({
  fetch = globalThis.fetch.bind(globalThis),
  events = globalThis,
  online = () => navigator.onLine,
  page,
}: ErrorReporterDeps = {}): ReportError {
  const seen = new Set<string>();

  const waiting: ClientError[] = [];

  const send = (report: ClientError) => {
    fetch(PATH, {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(report),
    }).catch(() => {});
  };

  events.addEventListener("online", () => {
    for (const report of waiting.splice(0)) quietly(() => send(report));
  });

  return (event, error, extra = {}) =>
    quietly(() => {
      const report = clientError(event, error, page?.(), extra);

      const key = `${report.error.message}\n${report.error.stack?.split("\n")[1] ?? ""}`;

      if (seen.has(key) || seen.size >= MAX_REPORTS) return;

      seen.add(key);

      if (online()) send(report);
      else waiting.push(report);
    });
}

function clientError(
  event: ClientErrorEvent,
  value: unknown,
  page: string | undefined,
  { component }: ReportExtra,
): ClientError {
  const error = reportedError(value);

  return {
    event,
    error,
    ...(page !== undefined && { page: page.slice(0, CLIENT_ERROR_LIMITS.page) }),
    build: CLIENT_BUILD,
    ...(component !== undefined && {
      component: component.slice(0, CLIENT_ERROR_LIMITS.component),
    }),
  };
}

function reportedError(value: unknown): ClientError["error"] {
  if (!(value instanceof Error)) {
    return { name: "Error", message: String(value).slice(0, CLIENT_ERROR_LIMITS.message) };
  }

  return {
    name: value.name.slice(0, CLIENT_ERROR_LIMITS.name),
    message: value.message.slice(0, CLIENT_ERROR_LIMITS.message),
    ...(value.stack !== undefined && { stack: value.stack.slice(0, CLIENT_ERROR_LIMITS.stack) }),
  };
}

function quietly(run: () => void): void {
  try {
    run();
  } catch {}
}
