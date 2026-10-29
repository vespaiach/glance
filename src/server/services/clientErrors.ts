import "server-only";
import { err, ok, type Result } from "@/domain/result";
import type { ClientError } from "@/domain/schemas";
import { deviceOf } from "@/domain/screens";
import type { RateLimiter } from "../auth/rateLimit";
import type { SignedInDisplay } from "../auth/sessions";
import { logError } from "../log";

export type ClientErrorDeps = { limiter: RateLimiter; now: () => Date };

export type ClientErrorSender = SignedInDisplay | { ip: string };

export type ClientInfo = { ip?: string; userAgent?: string };

const USER_AGENT_LIMIT = 300;

export function logClientError(
  { limiter, now }: ClientErrorDeps,
  sender: ClientErrorSender,
  report: ClientError,
  client: ClientInfo = {},
): Result<void, "rate-limited"> {
  const key = "ip" in sender ? `ip:${sender.ip}` : `display:${sender.displayId}`;

  if (!limiter.allow(key, now())) return err("rate-limited");

  const { page, build, component, digest, occurredAt, timeZone } = report;

  const ids = "ip" in sender ? {} : { accountId: sender.accountId, displayId: sender.displayId };

  logError("client", report.event, report.error, {
    page,
    build,
    component,
    digest,
    occurredAt,
    timeZone,
    ...ids,
    ...clientContext(client),
  });

  return ok(undefined);
}

function clientContext({ ip, userAgent }: ClientInfo) {
  return {
    ...(ip !== undefined && { ip: maskedIp(ip) }),
    ...(userAgent !== undefined && agentContext(userAgent)),
  };
}

function agentContext(userAgent: string) {
  const { kind, browser } = deviceOf(userAgent);

  return {
    ...(browser !== null && { browser }),
    device: kind,
    userAgent: userAgent.slice(0, USER_AGENT_LIMIT),
  };
}

function maskedIp(ip: string): string {
  const v4 = /^(?:::ffff:)?(\d+\.\d+\.\d+)\.\d+$/i.exec(ip);

  if (v4) return `${v4[1]}.0`;

  if (!ip.includes(":")) return "unknown";

  return `${ipv6Groups(ip).slice(0, 3).join(":")}::`;
}

function ipv6Groups(ip: string): string[] {
  const [head, tail] = ip.split("::");

  const left = head ? head.split(":") : [];

  const right = tail ? tail.split(":") : [];

  return [...left, ...Array<string>(8 - left.length - right.length).fill("0"), ...right];
}
