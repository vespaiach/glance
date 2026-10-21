import type { AuthDeps } from "./deps";
import { guestAvailable, signInAsGuest } from "./guest";
import { findDisplay } from "./sessions";
import { authHarnessPerTest, START } from "./testAuth";

const harness = authHarnessPerTest();

const GUEST_EMAIL = "guests@takeaglance.app";

const TRINH = "0192f3a0-0000-7000-8000-000000000001";

const OMAR = "0192f3a0-0000-7000-8000-000000000002";

const IP = "203.0.113.5";

const SIGN_IN = { ip: IP, userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)" };

const guestOn = (): AuthDeps => ({ ...harness.deps(), guestEmail: GUEST_EMAIL });

async function addAccount(id: string, email: string, setupDone: boolean): Promise<void> {
  await harness.deps().db.accounts.insert({
    id,
    email,
    name: setupDone ? "Trinh" : null,
    timeZone: "America/Indiana/Indianapolis",
    setupDoneAt: setupDone ? START.toISOString() : null,
    createdAt: START.toISOString(),
  });
}

async function addAccounts(): Promise<void> {
  await addAccount(TRINH, GUEST_EMAIL, true);
  await addAccount(OMAR, "omar@example.com", true);
}

describe("guestAvailable", () => {
  it("SIGNIN-16 is off when GUEST_EMAIL is unset", async () => {
    await addAccounts();

    expect(await guestAvailable(harness.deps())).toBe(false);
  });

  it("SIGNIN-16 is off when no account has GUEST_EMAIL", async () => {
    await addAccount(OMAR, "omar@example.com", true);

    expect(await guestAvailable(guestOn())).toBe(false);
  });

  it("SIGNIN-16 is off while the guest account's setup isn't done", async () => {
    await addAccount(TRINH, GUEST_EMAIL, false);

    expect(await guestAvailable(guestOn())).toBe(false);
  });

  it("SIGNIN-16 is on when GUEST_EMAIL names a set-up account", async () => {
    await addAccounts();

    expect(await guestAvailable(guestOn())).toBe(true);
  });
});

describe("signInAsGuest", () => {
  it("SIGNIN-16 answers not-found when guest sign-in is off", async () => {
    await addAccounts();

    expect(await signInAsGuest(harness.deps(), SIGN_IN)).toEqual({
      ok: false,
      error: "not-found",
    });
  });

  it("SIGNIN-16 answers not-found when the guest account doesn't exist", async () => {
    await addAccount(OMAR, "omar@example.com", true);

    expect(await signInAsGuest(guestOn(), SIGN_IN)).toEqual({ ok: false, error: "not-found" });
    expect(await harness.deps().db.displays.forAccount(TRINH)).toEqual([]);
    expect(await harness.deps().db.displays.forAccount(OMAR)).toEqual([]);
  });

  it("SIGNIN-16 signs in as the returning, set-up guest account", async () => {
    await addAccounts();

    const signedIn = await signInAsGuest(guestOn(), SIGN_IN);

    expect(signedIn.ok && signedIn.value.status).toEqual({
      state: "signed-in",
      account: { id: TRINH, email: GUEST_EMAIL, name: "Trinh" },
      returning: true,
      setupDone: true,
    });
  });

  it("SIGNIN-16 opens a display and session for the guest account only", async () => {
    await addAccounts();

    const signedIn = await signInAsGuest(guestOn(), SIGN_IN);

    const token = signedIn.ok ? signedIn.value.sessionToken : undefined;
    const display = await findDisplay(harness.deps().db, token);
    expect(display?.accountId).toBe(TRINH);
    expect(await harness.deps().db.displays.forAccount(TRINH)).toMatchObject([
      { accountId: TRINH, kind: "tablet", lastSeenAt: START.toISOString() },
    ]);
  });

  it("SIGNIN-16 limits guest sign-ins to 20 per IP per 10 minutes", async () => {
    await addAccounts();

    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect((await signInAsGuest(guestOn(), SIGN_IN)).ok).toBe(true);
    }

    expect(await signInAsGuest(guestOn(), SIGN_IN)).toEqual({
      ok: false,
      error: "rate-limited",
    });
    expect((await signInAsGuest(guestOn(), { ...SIGN_IN, ip: "198.51.100.7" })).ok).toBe(true);
    harness.advance(10 * 60 * 1000);
    expect((await signInAsGuest(guestOn(), SIGN_IN)).ok).toBe(true);
  });
});
