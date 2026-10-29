import { err, ok } from "@/domain/result";
import { requireApiKey } from "./apiKeys";
import { authHarnessPerTest, START, signIn } from "./testAuth";
import { hashToken } from "./tokens";

const harness = authHarnessPerTest();

const KEY = "glc_live_0123456789abcdefghijABCDEFGHx9Q2";

const BEARER = `Bearer ${KEY}`;

async function keyedAccount(): Promise<string> {
  const { accountId } = await signIn(harness, "maria@example.com");

  await harness.deps().db.apiKeys.insert({
    accountId,
    keyHash: hashToken(KEY),
    tail: "x9Q2",
    createdAt: START.toISOString(),
    lastUsedAt: null,
  });

  return accountId;
}

async function callTimes(times: number): Promise<void> {
  for (let call = 0; call < times; call++) await requireApiKey(harness.deps(), BEARER);
}

describe("requireApiKey", () => {
  it("API-01 answers the key's account and records its use", async () => {
    const accountId = await keyedAccount();
    harness.advance(60_000);

    expect(await requireApiKey(harness.deps(), BEARER)).toEqual(ok(accountId));
    expect((await harness.deps().db.apiKeys.get(accountId))?.lastUsedAt).toBe(
      new Date(START.getTime() + 60_000).toISOString(),
    );
  });

  it("API-01 rejects a call with no key", async () => {
    await keyedAccount();

    expect(await requireApiKey(harness.deps(), null)).toEqual(err({ error: "unauthorized" }));
  });

  it("API-01 rejects a wrong key or a key without Bearer", async () => {
    await keyedAccount();

    expect(await requireApiKey(harness.deps(), `Bearer ${KEY.slice(0, -1)}X`)).toEqual(
      err({ error: "unauthorized" }),
    );
    expect(await requireApiKey(harness.deps(), KEY)).toEqual(err({ error: "unauthorized" }));
  });

  it("API-01 rejects a revoked key", async () => {
    const accountId = await keyedAccount();
    await harness.deps().db.apiKeys.remove(accountId);

    expect(await requireApiKey(harness.deps(), BEARER)).toEqual(err({ error: "unauthorized" }));
  });

  it("API-02 the 61st call in a minute is limited with the seconds to wait", async () => {
    await keyedAccount();
    await callTimes(60);
    harness.advance(20_500);

    expect(await requireApiKey(harness.deps(), BEARER)).toEqual(
      err({ error: "limited", retryAfterS: 40 }),
    );
  });

  it("API-02 allows the key again after the minute", async () => {
    const accountId = await keyedAccount();
    await callTimes(61);
    harness.advance(60_000);

    expect(await requireApiKey(harness.deps(), BEARER)).toEqual(ok(accountId));
  });
});
