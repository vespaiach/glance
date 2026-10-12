import { MARIA, START, serviceHarnessPerTest } from "../services/testServices";
import { cleanupLinks } from "./links";

const harness = serviceHarnessPerTest();

const HOUR_MS = 60 * 60 * 1000;

function storeLink(tokenHash: string, expiresAt: Date, usedAt: Date | null = null): void {
  harness
    .deps()
    .db.prepare(
      `INSERT INTO magic_links (token_hash, email, pending_id, time_zone, expires_at, used_at)
       VALUES (?, 'maria@example.com', ?, 'America/New_York', ?, ?)`,
    )
    .run(tokenHash, `pending-${tokenHash}`, expiresAt.toISOString(), usedAt?.toISOString() ?? null);
}

function linkHashes(): string[] {
  const rows = harness
    .deps()
    .db.prepare("SELECT token_hash FROM magic_links ORDER BY token_hash")
    .all() as { token_hash: string }[];

  return rows.map((row) => row.token_hash);
}

function hoursAgo(hours: number): Date {
  return new Date(START.getTime() - hours * HOUR_MS);
}

describe("cleanupLinks", () => {
  it("SIGNIN-12 removes links that expired more than a day ago, used or not", () => {
    storeLink("a-old", hoursAgo(25));
    storeLink("b-old-used", hoursAgo(30), hoursAgo(30.1));

    cleanupLinks(harness.deps());

    expect(linkHashes()).toEqual([]);
  });

  it("SIGNIN-12 keeps live links and links expired within the day, so the waiting screen can still say why", () => {
    storeLink("a-live", new Date(START.getTime() + 5 * 60 * 1000));
    storeLink("b-expired", hoursAgo(2));
    storeLink("c-used", hoursAgo(23), hoursAgo(23.1));

    cleanupLinks(harness.deps());

    expect(linkHashes()).toEqual(["a-live", "b-expired", "c-used"]);
  });

  it("SIGNIN-12 leaves accounts and their sessions alone", () => {
    storeLink("a-old", hoursAgo(25));

    cleanupLinks(harness.deps());

    expect(harness.deps().db.prepare("SELECT id FROM accounts WHERE id = ?").get(MARIA)).toEqual({
      id: MARIA,
    });
  });
});
