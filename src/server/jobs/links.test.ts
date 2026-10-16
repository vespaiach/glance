import { MARIA, START, serviceHarnessPerTest } from "../services/testServices";
import { cleanupLinks } from "./links";

const harness = serviceHarnessPerTest();

const HOUR_MS = 60 * 60 * 1000;

async function storeLink(
  tokenHash: string,
  expiresAt: Date,
  usedAt: Date | null = null,
): Promise<void> {
  await harness.deps().db.run(
    `INSERT INTO magic_links (token_hash, email, pending_id, time_zone, expires_at, used_at)
     VALUES ($1, 'maria@example.com', $2, 'America/New_York', $3, $4)`,
    [tokenHash, `pending-${tokenHash}`, expiresAt.toISOString(), usedAt?.toISOString() ?? null],
  );
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

describe("cleanupLinks", () => {
  it("SIGNIN-12 removes links that expired more than a day ago, used or not", async () => {
    await storeLink("a-old", hoursAgo(25));
    await storeLink("b-old-used", hoursAgo(30), hoursAgo(30.1));

    await cleanupLinks(harness.deps());

    expect(await linkHashes()).toEqual([]);
  });

  it("SIGNIN-12 keeps live links and links expired within the day, so the waiting screen can still say why", async () => {
    await storeLink("a-live", new Date(START.getTime() + 5 * 60 * 1000));
    await storeLink("b-expired", hoursAgo(2));
    await storeLink("c-used", hoursAgo(23), hoursAgo(23.1));

    await cleanupLinks(harness.deps());

    expect(await linkHashes()).toEqual(["a-live", "b-expired", "c-used"]);
  });

  it("SIGNIN-15 removes expired QR codes too and keeps a live one", async () => {
    const db = harness.deps().db;
    await db.run("INSERT INTO displays (id, account_id) VALUES ('d1', $1)", [MARIA]);
    const storeQr = (tokenHash: string, expiresAt: Date) =>
      db.run(
        `INSERT INTO magic_links (token_hash, email, kind, account_id, display_id, time_zone, expires_at)
         VALUES ($1, 'maria@example.com', 'qr', $2, 'd1', 'America/New_York', $3)`,
        [tokenHash, MARIA, expiresAt.toISOString()],
      );
    await storeQr("a-old", hoursAgo(25));
    await storeQr("b-live", new Date(START.getTime() + 5 * 60 * 1000));

    await cleanupLinks(harness.deps());

    expect(await linkHashes()).toEqual(["b-live"]);
  });

  it("SIGNIN-12 leaves accounts and their sessions alone", async () => {
    await storeLink("a-old", hoursAgo(25));

    await cleanupLinks(harness.deps());

    expect(await harness.deps().db.one("SELECT id FROM accounts WHERE id = $1", [MARIA])).toEqual({
      id: MARIA,
    });
  });
});
