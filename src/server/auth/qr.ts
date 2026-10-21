import "server-only";
import { QR_CODE_TTL_MS } from "@/domain/qrSignIn";
import { err, ok, type Result } from "@/domain/result";
import type { Db } from "../db/db";
import type { AuthDeps, Clocked } from "./deps";
import { openDisplay, type SignedInDisplay } from "./sessions";
import { hashToken, newToken } from "./tokens";

export type QrCode = { url: string };

export type QrVerifyInput = { token: string; userAgent?: string };

type LinkRow = {
  token_hash: string;
  account_id: string;
  expires_at: string;
  used_at: string | null;
};

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
  const link = await db.one<LinkRow>("SELECT * FROM magic_links WHERE token_hash = $1", [
    hashToken(token),
  ]);

  const at = now().toISOString();

  if (link === undefined || link.used_at !== null || link.expires_at <= at) return err("stale");

  const sessionToken = await db.tx(async (tx) => {
    await tx.run("UPDATE magic_links SET used_at = $1 WHERE token_hash = $2", [
      at,
      link.token_hash,
    ]);

    return openDisplay(tx, link.account_id, { at, userAgent });
  });

  return ok({ sessionToken });
}

export async function voidQrLink(
  db: Db,
  { accountId, displayId }: SignedInDisplay,
  url: string,
): Promise<void> {
  const token = new URL(url).searchParams.get("t");

  if (token === null) return;

  await db.run(
    "DELETE FROM magic_links WHERE token_hash = $1 AND account_id = $2 AND display_id = $3 AND used_at IS NULL",
    [hashToken(token), accountId, displayId],
  );
}

async function storeQrLink(
  { db, now }: AuthDeps,
  display: SignedInDisplay,
  token: string,
): Promise<void> {
  const expiresAt = new Date(now().getTime() + QR_CODE_TTL_MS).toISOString();

  await db.tx(async (tx) => {
    await tx.run("DELETE FROM magic_links WHERE display_id = $1 AND used_at IS NULL", [
      display.displayId,
    ]);
    await tx.run(
      "INSERT INTO magic_links (token_hash, account_id, display_id, expires_at) VALUES ($1, $2, $3, $4)",
      [hashToken(token), display.accountId, display.displayId, expiresAt],
    );
  });
}

function verifyUrl(appUrl: string, token: string): string {
  const url = new URL("/api/auth/verify", appUrl);

  url.searchParams.set("t", token);

  return url.toString();
}
