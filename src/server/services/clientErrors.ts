import "server-only";
import { err, ok, type Result } from "@/domain/result";
import type { ClientError } from "@/domain/schemas";
import type { RateLimiter } from "../auth/rateLimit";
import type { SignedInDisplay } from "../auth/sessions";
import { logError } from "../log";

export type ClientErrorDeps = { limiter: RateLimiter; now: () => Date };

export type ClientErrorSender = SignedInDisplay | { ip: string };

export function logClientError(
  { limiter, now }: ClientErrorDeps,
  sender: ClientErrorSender,
  report: ClientError,
): Result<void, "rate-limited"> {
  const key = "ip" in sender ? `ip:${sender.ip}` : `display:${sender.displayId}`;

  if (!limiter.allow(key, now())) return err("rate-limited");

  const { page, build, component, digest } = report;

  const ids = "ip" in sender ? {} : { accountId: sender.accountId, displayId: sender.displayId };

  logError("client", report.event, report.error, { page, build, component, digest, ...ids });

  return ok(undefined);
}
