import "server-only";
import { QR_CODE_TTL_MS } from "@/domain/qrSignIn";
import { err, ok, type Result } from "@/domain/result";
import type { Db } from "../db/db";
import type { AuthDeps } from "./deps";
import { verifyUrl } from "./links";
import type { SignedInDisplay } from "./sessions";
import { hashToken, newToken } from "./tokens";

export type QrCode = { url: string };

export async function issueQrLink(
  deps: AuthDeps,
  display: SignedInDisplay,
): Promise<Result<QrCode, "rate-limited">> {
  if (!deps.limits.qr.allow(display.displayId, deps.now())) return err("rate-limited");

  const token = newToken();

  await storeQrLink(deps, display, token);

  return ok({ url: verifyUrl(deps.appUrl, token) });
}

export async function voidQrLink(
  db: Db,
  { accountId, displayId }: SignedInDisplay,
  url: string,
): Promise<void> {
  const token = new URL(url).searchParams.get("t");

  if (token === null) return;

  await db.run(
    "DELETE FROM magic_links WHERE token_hash = $1 AND kind = 'qr' AND account_id = $2 AND display_id = $3 AND used_at IS NULL",
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
    await tx.run(
      "DELETE FROM magic_links WHERE kind = 'qr' AND display_id = $1 AND used_at IS NULL",
      [display.displayId],
    );
    await tx.run(
      "INSERT INTO magic_links (token_hash, email, kind, account_id, display_id, time_zone, expires_at) SELECT $1, email, 'qr', id, $2, time_zone, $3 FROM accounts WHERE id = $4",
      [hashToken(token), display.displayId, expiresAt, display.accountId],
    );
  });
}
