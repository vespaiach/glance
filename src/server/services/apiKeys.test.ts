import { createHash } from "node:crypto";
import { err } from "@/domain/result";
import { apiKey, createApiKey, revokeApiKey } from "./apiKeys";
import { MARIA, OMAR, START, serviceHarnessPerTest } from "./testServices";

const harness = serviceHarnessPerTest();

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

async function created(accountId: string): Promise<string> {
  const result = await createApiKey(harness.deps(), accountId);

  if (!result.ok) throw new Error(result.error);

  return result.value.key;
}

describe("createApiKey", () => {
  it("SET-19 create returns a glc_live_ + 32 base62 key and stores only its hash", async () => {
    const key = await created(MARIA);

    expect(key).toMatch(/^glc_live_[0-9A-Za-z]{32}$/);
    expect(await harness.deps().db.apiKeys.get(MARIA)).toEqual({
      accountId: MARIA,
      keyHash: sha256(key),
      tail: key.slice(-4),
      createdAt: START.toISOString(),
      lastUsedAt: null,
    });
  });

  it("SET-19 a second create is 409 and keeps the first key", async () => {
    const key = await created(MARIA);

    expect(await createApiKey(harness.deps(), MARIA)).toEqual(err("exists"));
    expect((await harness.deps().db.apiKeys.get(MARIA))?.keyHash).toBe(sha256(key));
  });

  it("SET-19 makes a different key each time", async () => {
    expect(await created(MARIA)).not.toBe(await created(OMAR));
  });
});

describe("apiKey", () => {
  it("SET-19 get answers the tail, created and last used, never the key", async () => {
    const key = await created(MARIA);

    const shown = await apiKey(harness.deps(), MARIA);

    expect(shown).toEqual({
      ok: true,
      value: { tail: key.slice(-4), createdAt: START.toISOString(), lastUsedAt: null },
    });
    expect(JSON.stringify(shown)).not.toContain(key);
  });

  it("SET-19 get is not-found without a key", async () => {
    expect(await apiKey(harness.deps(), MARIA)).toEqual(err("not-found"));
  });
});

describe("revokeApiKey", () => {
  it("SET-19 revoke removes it, so a new one can be created", async () => {
    await created(MARIA);

    expect((await revokeApiKey(harness.deps(), MARIA)).ok).toBe(true);
    expect(await harness.deps().db.apiKeys.get(MARIA)).toBeUndefined();
    expect((await createApiKey(harness.deps(), MARIA)).ok).toBe(true);
  });

  it("SET-19 revoke is not-found without a key", async () => {
    expect(await revokeApiKey(harness.deps(), MARIA)).toEqual(err("not-found"));
  });

  it("tech§5 another account's key can't be read or revoked", async () => {
    await created(MARIA);

    expect(await apiKey(harness.deps(), OMAR)).toEqual(err("not-found"));
    expect(await revokeApiKey(harness.deps(), OMAR)).toEqual(err("not-found"));
    expect(await harness.deps().db.apiKeys.get(MARIA)).toBeDefined();
  });
});
