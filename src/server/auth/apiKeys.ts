import "server-only";
import { err, ok, type Result } from "@/domain/result";
import type { AuthDeps } from "./deps";
import { hashToken } from "./tokens";

export type ApiKeyRefusal = { error: "unauthorized" } | { error: "limited"; retryAfterS: number };

const BEARER = /^Bearer (glc_live_[0-9A-Za-z]{32})$/;

export async function requireApiKey(
  { db, now, limits }: Pick<AuthDeps, "db" | "now" | "limits">,
  authorization: string | null,
): Promise<Result<string, ApiKeyRefusal>> {
  const key = authorization?.match(BEARER)?.[1];

  if (key === undefined) return err({ error: "unauthorized" });

  const keyHash = hashToken(key);

  if (!limits.apiKey.allow(keyHash, now()))
    return err(limited(limits.apiKey.retryAfterMs(keyHash, now())));

  const accountId = await db.apiKeys.use(keyHash, now().toISOString());

  return accountId === undefined ? err({ error: "unauthorized" }) : ok(accountId);
}

function limited(retryAfterMs: number): ApiKeyRefusal {
  return { error: "limited", retryAfterS: Math.ceil(retryAfterMs / 1000) };
}
