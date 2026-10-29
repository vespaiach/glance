import "server-only";
import type { QrOpens } from "@/domain/qrSignIn";
import { ok } from "@/domain/result";
import { syncBus } from "../bus";
import { database } from "../db";
import { env } from "../env";
import { mailer } from "../mail";
import { photoStore } from "../storage";
import * as account from "./account";
import * as apiKeys from "./apiKeys";
import * as codes from "./codes";
import type { AuthDeps } from "./deps";
import * as qr from "./qr";
import { createRateLimiter } from "./rateLimit";
import type { SignedInDisplay } from "./sessions";
import * as sessions from "./sessions";
import * as status from "./status";
import { newCode } from "./tokens";

export type { ApiKeyRefusal } from "./apiKeys";
export type { CodeError } from "./codes";
export { clientIp, isAllowedOrigin } from "./guards";
export type { QrCode } from "./qr";
export type { SessionError, SignedInDisplay } from "./sessions";

const ONE_MINUTE = 60 * 1000;

const TEN_MINUTES = 10 * 60 * 1000;

const ONE_HOUR = 60 * 60 * 1000;

const shared = globalThis as typeof globalThis & { glanceAuth?: AuthDeps };

export function appUrl(): string {
  return deps().appUrl;
}

export function requestCode(input: codes.CodeInput) {
  return codes.requestCode(deps(), input);
}

export function verifyCode(input: codes.VerifyCodeInput) {
  return codes.verifyCode(deps(), input);
}

export function verifyQrLink(input: qr.QrVerifyInput) {
  return qr.verifyQrLink(deps(), input);
}

export function issueQrLink(display: SignedInDisplay, opens?: QrOpens) {
  return qr.issueQrLink(deps(), display, opens);
}

export function voidQrLink(display: SignedInDisplay, url: string): Promise<void> {
  return qr.voidQrLink(deps().db, display, url);
}

export function authStatus(sessionToken: string | undefined) {
  return status.authStatus(deps(), sessionToken);
}

export function requireDisplay(sessionToken: string | undefined) {
  return sessions.requireDisplay(deps(), sessionToken);
}

export function requireApiKey(authorization: string | null) {
  return apiKeys.requireApiKey(deps(), authorization);
}

export function signOut(sessionToken: string | undefined): Promise<void> {
  return sessions.signOut(deps().db, sessionToken);
}

export async function signOutAll(accountId: string): Promise<void> {
  const { db } = deps();

  await sessions.signOutAll(deps(), accountId);

  syncBus().publish(accountId, await db.versions.current());
}

export async function deleteAccount(accountId: string): Promise<void> {
  const { db } = deps();

  await account.deleteAccount({ ...deps(), store: photoStore() }, accountId);

  syncBus().publish(accountId, await db.versions.current());
}

export async function saveName(accountId: string, name: string) {
  const saved = await account.saveName(deps(), accountId, name);

  if (saved.ok && saved.value.firstTag) {
    syncBus().publish(accountId, saved.value.firstTag.version);
  }

  return saved.ok ? ok(saved.value.account) : saved;
}

function deps(): AuthDeps {
  shared.glanceAuth ??= {
    db: database(),
    now: () => new Date(),
    mailer: mailer(),
    appUrl: env().APP_URL,
    newCode,
    limits: {
      email: createRateLimiter({ limit: 5, windowMs: TEN_MINUTES }),
      ip: createRateLimiter({ limit: 20, windowMs: TEN_MINUTES }),
      verify: createRateLimiter({ limit: 30, windowMs: TEN_MINUTES }),
      qr: createRateLimiter({ limit: 30, windowMs: ONE_HOUR }),
      apiKey: createRateLimiter({ limit: 60, windowMs: ONE_MINUTE }),
    },
  };

  return shared.glanceAuth;
}
