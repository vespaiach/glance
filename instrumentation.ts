import type { Instrumentation } from "next";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { bootServer } = await import("@/server/boot");

  await bootServer();
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { logError } = await import("@/server/log");

  logError("route", "request-failed", error, {
    method: request.method,
    route: context.routePath,
    ...digestOf(error),
  });
};

function digestOf(error: unknown): { digest?: string } {
  if (typeof error !== "object" || error === null || !("digest" in error)) return {};

  return typeof error.digest === "string" ? { digest: error.digest } : {};
}
