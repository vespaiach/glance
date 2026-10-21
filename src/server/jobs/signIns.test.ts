import { MARIA, START, serviceHarnessPerTest } from "../services/testServices";
import { cleanupSignIns } from "./signIns";

const harness = serviceHarnessPerTest();

const HOUR_MS = 60 * 60 * 1000;

async function storeCode(email: string, expiresAt: Date): Promise<void> {
  await harness
    .deps()
    .db.run(
      "INSERT INTO sign_in_codes (email, code_hash, time_zone, expires_at) VALUES ($1, 'hash', 'America/New_York', $2)",
      [email, expiresAt.toISOString()],
    );
}

async function storeQr(tokenHash: string, expiresAt: Date, usedAt: Date | null = null) {
  const db = harness.deps().db;

  await db.run("INSERT INTO displays (id, account_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [
    "d1",
    MARIA,
  ]);
  await db.run(
    "INSERT INTO magic_links (token_hash, account_id, display_id, expires_at, used_at) VALUES ($1, $2, 'd1', $3, $4)",
    [tokenHash, MARIA, expiresAt.toISOString(), usedAt?.toISOString() ?? null],
  );
}

async function codeEmails(): Promise<string[]> {
  const rows = await harness
    .deps()
    .db.all<{ email: string }>("SELECT email FROM sign_in_codes ORDER BY email");

  return rows.map((row) => row.email);
}

async function linkHashes(): Promise<string[]> {
  const rows = await harness
    .deps()
    .db.all<{ token_hash: string }>("SELECT token_hash FROM magic_links ORDER BY token_hash");

  return rows.map((row) => row.token_hash);
}

function hoursAgo(hours: number): Date {
  return new Date(START.getTime() - hours * HOUR_MS);
}

describe("cleanupSignIns", () => {
  it("SIGNIN-12 removes codes that expired more than a day ago", async () => {
    await storeCode("a@example.com", hoursAgo(25));

    await cleanupSignIns(harness.deps());

    expect(await codeEmails()).toEqual([]);
  });

  it("SIGNIN-12 keeps live codes and codes expired within the day", async () => {
    await storeCode("a@example.com", new Date(START.getTime() + 5 * 60 * 1000));
    await storeCode("b@example.com", hoursAgo(2));

    await cleanupSignIns(harness.deps());

    expect(await codeEmails()).toEqual(["a@example.com", "b@example.com"]);
  });

  it("SIGNIN-15 removes QR links that expired more than a day ago, used or not, and keeps a live one", async () => {
    await storeQr("a-old", hoursAgo(25));
    await storeQr("b-old-used", hoursAgo(30), hoursAgo(30.1));
    await storeQr("c-live", new Date(START.getTime() + 5 * 60 * 1000));

    await cleanupSignIns(harness.deps());

    expect(await linkHashes()).toEqual(["c-live"]);
  });

  it("SIGNIN-12 leaves accounts alone", async () => {
    await storeCode("maria@example.com", hoursAgo(25));

    await cleanupSignIns(harness.deps());

    expect(await harness.deps().db.one("SELECT id FROM accounts WHERE id = $1", [MARIA])).toEqual({
      id: MARIA,
    });
  });
});
