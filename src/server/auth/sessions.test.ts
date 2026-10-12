import { saveName } from "./account";
import { requestLink, verifyLink } from "./links";
import { requireDisplay, signOut } from "./sessions";
import { authHarnessPerTest, linkToken } from "./testAuth";

const harness = authHarnessPerTest();

async function signIn(email: string): Promise<{ sessionToken: string; accountId: string }> {
  await requestLink(harness.deps(), { email, timeZone: "America/New_York", ip: "203.0.113.5" });

  const verified = verifyLink(harness.deps(), { token: linkToken(harness.sent.at(-1)) });

  if (!verified.ok) throw new Error(verified.error.code);

  const display = requireDisplay(harness.deps(), verified.value.sessionToken);

  if (!display.ok) throw new Error(display.error);

  return { sessionToken: verified.value.sessionToken, accountId: display.value.accountId };
}

function accountNames(): unknown[] {
  return harness.deps().db.prepare("SELECT email, name FROM accounts ORDER BY email").all();
}

describe("requireDisplay", () => {
  it("tech§6.1 rejects a request with no session", () => {
    expect(requireDisplay(harness.deps(), undefined)).toEqual({ ok: false, error: "unauthorized" });
  });

  it("tech§6.1 rejects an unknown session token", () => {
    expect(requireDisplay(harness.deps(), "forged")).toEqual({ ok: false, error: "unauthorized" });
  });

  it("tech§6.1 resolves a session to its display and account and records when it was seen", async () => {
    const { sessionToken } = await signIn("maria@example.com");
    harness.advance(5000);

    const display = requireDisplay(harness.deps(), sessionToken);

    const row = harness
      .deps()
      .db.prepare("SELECT id, account_id, last_seen_at FROM displays")
      .get();
    expect(display).toEqual({
      ok: true,
      value: {
        displayId: (row as { id: string }).id,
        accountId: (row as { account_id: string }).account_id,
      },
    });
    expect(row).toMatchObject({ last_seen_at: "2026-10-09T14:00:05.000Z" });
  });
});

describe("signOut", () => {
  it("SIGNIN-11 signs out this screen only", async () => {
    const kitchen = await signIn("maria@example.com");
    const hall = await signIn("maria@example.com");

    signOut(harness.deps().db, kitchen.sessionToken);

    expect(requireDisplay(harness.deps(), kitchen.sessionToken).ok).toBe(false);
    expect(requireDisplay(harness.deps(), hall.sessionToken).ok).toBe(true);
  });

  it("SIGNIN-11 removes the signed-out display", async () => {
    const kitchen = await signIn("maria@example.com");

    signOut(harness.deps().db, kitchen.sessionToken);

    expect(harness.deps().db.prepare("SELECT id FROM displays").all()).toEqual([]);
  });

  it("SIGNIN-11 does nothing without a session", () => {
    expect(() => signOut(harness.deps().db, undefined)).not.toThrow();
  });
});

describe("saveName", () => {
  it("SIGNIN-06 saves the trimmed name and returns the account", async () => {
    const { accountId } = await signIn("maria@example.com");

    const result = saveName(harness.deps().db, accountId, "  Maria Lopez ");

    expect(result).toEqual({
      ok: true,
      value: { id: accountId, email: "maria@example.com", name: "Maria Lopez" },
    });
  });

  it("SIGNIN-06 never writes another account's name", async () => {
    const maria = await signIn("maria@example.com");
    await signIn("sam@example.com");

    saveName(harness.deps().db, maria.accountId, "Maria");

    expect(accountNames()).toEqual([
      { email: "maria@example.com", name: "Maria" },
      { email: "sam@example.com", name: null },
    ]);
  });

  it("SIGNIN-06 reports an account that doesn't exist", () => {
    expect(saveName(harness.deps().db, "01890000-0000-7000-8000-000000000000", "Maria")).toEqual({
      ok: false,
      error: "not-found",
    });
  });
});
