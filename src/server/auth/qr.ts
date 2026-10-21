import "server-only";
import { QR_CODE_TTL_MS } from "@/domain/qrSignIn";
import { err, ok, type Result } from "@/domain/result";
import type { Database, MagicLinkRecord } from "../db";
import type { AuthDeps, Clocked } from "./deps";
import { openDisplay, type SignedInDisplay } from "./sessions";
import { hashToken, newToken } from "./tokens";

export type QrCode = { url: string };

export type QrVerifyInput = { token: string; userAgent?: string };

export async function issueQrLink(
  deps: AuthDeps,
  display: SignedInDisplay,
): Promise<Result<QrCode, "rate-limited">> {
  if (!deps.limits.qr.allow(display.displayId, deps.now())) return err("rate-limited");

  const token = newToken();

  await storeQrLink(deps, display, token);

  return ok({ url: verifyUrl(deps.appUrl, token) });
}

export async function verifyQrLink(
  { db, now }: Clocked,
  { token, userAgent }: QrVerifyInput,
): Promise<Result<{ sessionToken: string }, "stale">> {
  const link = await db.magicLinks.get(hashToken(token));

  const at = now().toISOString();

  if (link === undefined || link.usedAt !== null || link.expiresAt <= at) return err("stale");

  const sessionToken = await db.tx(async (tx) => {
    await tx.magicLinks.markUsed(link.tokenHash, at);

    return openDisplay(tx, link.accountId, { at, userAgent });
  });

  return ok({ sessionToken });
}

export async function voidQrLink(
  db: Database,
  display: SignedInDisplay,
  url: string,
): Promise<void> {
  const token = new URL(url).searchParams.get("t");

  if (token === null) return;

  await db.tx(async (tx) => {
    const link = await tx.magicLinks.get(hashToken(token));

    if (link && isUnusedLinkOf(link, display)) await tx.magicLinks.remove(link.tokenHash);
  });
}

async function storeQrLink(
  { db, now }: AuthDeps,
  { accountId, displayId }: SignedInDisplay,
  token: string,
): Promise<void> {
  const expiresAt = new Date(now().getTime() + QR_CODE_TTL_MS).toISOString();

  await db.tx(async (tx) => {
    await tx.magicLinks.removeUnusedFor(displayId);
    await tx.magicLinks.insert({
      tokenHash: hashToken(token),
      accountId,
      displayId,
      expiresAt,
      usedAt: null,
    });
  });
}

function isUnusedLinkOf(link: MagicLinkRecord, display: SignedInDisplay): boolean {
  return (
    link.accountId === display.accountId &&
    link.displayId === display.displayId &&
    link.usedAt === null
  );
}

function verifyUrl(appUrl: string, token: string): string {
  const url = new URL("/api/auth/verify", appUrl);

  url.searchParams.set("t", token);

  return url.toString();
}
