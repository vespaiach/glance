import "server-only";
import { ok } from "@/domain/result";
import { syncBus } from "../bus";
import { getDb } from "../db/db";
import { env } from "../env";
import { mailer } from "../mail";
import * as account from "./account";
import type { AuthDeps } from "./deps";
import * as guest from "./guest";
import * as links from "./links";
import * as qr from "./qr";
import { createRateLimiter } from "./rateLimit";
import type { SignedInDisplay } from "./sessions";
import * as sessions from "./sessions";
import * as status from "./status";

export { clientIp, isAllowedOrigin } from "./guards";
export type { QrCode } from "./qr";
export type { SignedInDisplay } from "./sessions";

const TEN_MINUTES = 10 * 60 * 1000;

const ONE_HOUR = 60 * 60 * 1000;

const shared = globalThis as typeof globalThis & { glanceAuth?: AuthDeps };

export function appUrl(): string {
  return deps().appUrl;
}

export function requestLink(input: links.LinkInput) {
  return links.requestLink(deps(), input);
}

export function verifyLink(input: links.VerifyInput) {
  return links.verifyLink(deps(), input);
}

export function issueQrLink(display: SignedInDisplay) {
  return qr.issueQrLink(deps(), display);
}

export function voidQrLink(display: SignedInDisplay, url: string): Promise<void> {
  return qr.voidQrLink(deps().db, display, url);
}

export function guestAvailable(): Promise<boolean> {
  return guest.guestAvailable(deps());
}

export function signInAsGuest(input: guest.GuestInput) {
  return guest.signInAsGuest(deps(), input);
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

export async function saveName(accountId: string, name: string) {
  const saved = await account.saveName(deps(), accountId, name);

  if (saved.ok && saved.value.firstMember) {
    syncBus().publish(accountId, saved.value.firstMember.version);
  }

  return saved.ok ? ok(saved.value.account) : saved;
}

function deps(): AuthDeps {
  shared.glanceAuth ??= {
    db: getDb(),
    now: () => new Date(),
    mailer: mailer(),
    appUrl: env().APP_URL,
    guestEmail: env().GUEST_EMAIL,
    limits: {
      email: createRateLimiter({ limit: 5, windowMs: TEN_MINUTES }),
      ip: createRateLimiter({ limit: 20, windowMs: TEN_MINUTES }),
      qr: createRateLimiter({ limit: 30, windowMs: ONE_HOUR }),
      guest: createRateLimiter({ limit: 20, windowMs: TEN_MINUTES }),
    },
  };

  return shared.glanceAuth;
}
