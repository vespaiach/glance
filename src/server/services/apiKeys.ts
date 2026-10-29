import "server-only";
import { randomInt } from "node:crypto";
import { err, ok, type Result } from "@/domain/result";
import { hashToken } from "../auth/tokens";
import type { ApiKeyRecord } from "../db";
import type { ServiceDeps } from "./deps";

export type ApiKey = { tail: string; createdAt: string; lastUsedAt: string | null };

export type NewApiKey = ApiKey & { key: string };

const KEY_PREFIX = "glc_live_";

const KEY_LENGTH = 32;

const TAIL_LENGTH = 4;

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export async function createApiKey(
  { db, now }: ServiceDeps,
  accountId: string,
): Promise<Result<NewApiKey, "exists">> {
  const key = newApiKey();

  const record: ApiKeyRecord = {
    accountId,
    keyHash: hashToken(key),
    tail: key.slice(-TAIL_LENGTH),
    createdAt: now().toISOString(),
    lastUsedAt: null,
  };

  if (!(await db.apiKeys.insert(record))) return err("exists");

  return ok({ ...masked(record), key });
}

export async function apiKey(
  { db }: ServiceDeps,
  accountId: string,
): Promise<Result<ApiKey, "not-found">> {
  const record = await db.apiKeys.get(accountId);

  return record ? ok(masked(record)) : err("not-found");
}

export async function revokeApiKey(
  { db }: ServiceDeps,
  accountId: string,
): Promise<Result<undefined, "not-found">> {
  return (await db.apiKeys.remove(accountId)) ? ok(undefined) : err("not-found");
}

function newApiKey(): string {
  const chars = Array.from({ length: KEY_LENGTH }, () => BASE62[randomInt(BASE62.length)]);

  return KEY_PREFIX + chars.join("");
}

function masked({ tail, createdAt, lastUsedAt }: ApiKeyRecord): ApiKey {
  return { tail, createdAt, lastUsedAt };
}
