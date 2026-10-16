import "server-only";
import { getDb } from "../db/db";
import { env } from "../env";
import { createMailer } from "../mail/mailer";
import * as account from "./account";
import type { AuthDeps } from "./deps";
import * as links from "./links";
import { createRateLimiter } from "./rateLimit";
import * as sessions from "./sessions";
import * as status from "./status";

export { clientIp, isAllowedOrigin } from "./guards";
export type { SignedInDisplay } from "./sessions";

const TEN_MINUTES = 10 * 60 * 1000;

const shared = globalThis as typeof globalThis & { glanceAuth?: AuthDeps };

function deps(): AuthDeps {
  shared.glanceAuth ??= {
    db: getDb(),
    now: () => new Date(),
    mailer: createMailer(env().RESEND_API_KEY, env().MAIL_FROM),
    appUrl: env().APP_URL,
    limits: {
      email: createRateLimiter({ limit: 5, windowMs: TEN_MINUTES }),
      ip: createRateLimiter({ limit: 20, windowMs: TEN_MINUTES }),
    },
  };

  return shared.glanceAuth;
}

export function appUrl(): string {
  return deps().appUrl;
}

export function requestLink(input: links.LinkInput) {
  return links.requestLink(deps(), input);
}

export function verifyLink(input: links.VerifyInput) {
  return links.verifyLink(deps(), input);
}

export function authStatus(input: status.StatusInput) {
  return status.authStatus(deps(), input);
}

export function requireDisplay(sessionToken: string | undefined) {
  return sessions.requireDisplay(deps(), sessionToken);
}

export function signOut(sessionToken: string | undefined): Promise<void> {
  return sessions.signOut(deps().db, sessionToken);
}

export function saveName(accountId: string, name: string) {
  return account.saveName(deps().db, accountId, name);
}
