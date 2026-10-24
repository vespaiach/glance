import { MARIA, START, serviceHarnessPerTest } from "../services/testServices";
import { cleanupSignIns } from "./signIns";

const harness = serviceHarnessPerTest();

const HOUR_MS = 60 * 60 * 1000;

const CODE_EMAILS = ["a@example.com", "b@example.com", "maria@example.com"];

const LINK_HASHES = ["a-old", "b-old-used", "c-live"];

beforeEach(async () => {
  await harness.deps().db.displays.insert({
    id: "d1",
    accountId: MARIA,
    kind: "monitor",
    browser: null,
    lastSeenAt: START.toISOString(),
  });
});

async function storeCode(email: string, expiresAt: Date): Promise<void> {
  await harness.deps().db.signInCodes.put({
    email,
    codeHash: "hash",
    timeZone: "America/New_York",
    tries: 0,
    expiresAt: expiresAt.toISOString(),
  });
}

async function storeQr(tokenHash: string, expiresAt: Date, usedAt: Date | null = null) {
  await harness.deps().db.magicLinks.insert({
    tokenHash,
    accountId: MARIA,
    displayId: "d1",
    expiresAt: expiresAt.toISOString(),
    usedAt: usedAt?.toISOString() ?? null,
  });
}

async function codeEmails(): Promise<string[]> {
  const kept = await Promise.all(
    CODE_EMAILS.map(async (email) => (await harness.deps().db.signInCodes.get(email)) && email),
  );

  return kept.filter((email) => email !== undefined);
}

async function linkHashes(): Promise<string[]> {
  const kept = await Promise.all(
    LINK_HASHES.map(async (hash) => (await harness.deps().db.magicLinks.get(hash)) && hash),
  );

  return kept.filter((hash) => hash !== undefined);
}

function hoursAgo(hours: number): Date {
  return new Date(START.getTime() - hours * HOUR_MS);
}

function daysAgo(days: number): Date {
  return hoursAgo(days * 24);
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

  it("SIGNIN-18 forgets revoked sessions after 400 days and keeps newer ones", async () => {
    const { db } = harness.deps();
    await db.sessions.insert({ tokenHash: "old", displayId: "d1", createdAt: START.toISOString() });
    await db.sessions.revokeForAccount(MARIA, daysAgo(401).toISOString());
    await db.sessions.insert({ tokenHash: "new", displayId: "d1", createdAt: START.toISOString() });
    await db.sessions.revokeForAccount(MARIA, daysAgo(399).toISOString());

    await cleanupSignIns(harness.deps());

    expect(await db.sessions.revoked("old")).toBe(false);
    expect(await db.sessions.revoked("new")).toBe(true);
  });

  it("SIGNIN-12 leaves accounts alone", async () => {
    await storeCode("maria@example.com", hoursAgo(25));

    await cleanupSignIns(harness.deps());

    expect(await harness.deps().db.accounts.byId(MARIA)).toMatchObject({ id: MARIA });
  });
});
