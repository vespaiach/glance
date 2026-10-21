import { saveName } from "./account";
import { requireDisplay, signOut } from "./sessions";
import { authHarnessPerTest, signIn as signInWithCode } from "./testAuth";

const harness = authHarnessPerTest();

function signIn(email: string): Promise<{ sessionToken: string; accountId: string }> {
  return signInWithCode(harness, email);
}

function accountNames(): Promise<unknown[]> {
  return harness.deps().db.all("SELECT email, name FROM accounts ORDER BY email");
}

describe("requireDisplay", () => {
  it("tech§6.1 rejects a request with no session", async () => {
    expect(await requireDisplay(harness.deps(), undefined)).toEqual({
      ok: false,
      error: "unauthorized",
    });
  });

  it("tech§6.1 rejects an unknown session token", async () => {
    expect(await requireDisplay(harness.deps(), "forged")).toEqual({
      ok: false,
      error: "unauthorized",
    });
  });

  it("tech§6.1 resolves a session to its display and account and records when it was seen", async () => {
    const { sessionToken } = await signIn("maria@example.com");
    harness.advance(5000);

    const display = await requireDisplay(harness.deps(), sessionToken);

    const row = await harness.deps().db.one("SELECT id, account_id, last_seen_at FROM displays");
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

    await signOut(harness.deps().db, kitchen.sessionToken);

    expect((await requireDisplay(harness.deps(), kitchen.sessionToken)).ok).toBe(false);
    expect((await requireDisplay(harness.deps(), hall.sessionToken)).ok).toBe(true);
  });

  it("SIGNIN-11 removes the signed-out display", async () => {
    const kitchen = await signIn("maria@example.com");

    await signOut(harness.deps().db, kitchen.sessionToken);

    expect(await harness.deps().db.all("SELECT id FROM displays")).toEqual([]);
  });

  it("SIGNIN-11 does nothing without a session", async () => {
    await expect(signOut(harness.deps().db, undefined)).resolves.toBeUndefined();
  });
});

function memberNames() {
  return harness.deps().db.all("SELECT account_id, name FROM members ORDER BY created_at");
}

describe("saveName", () => {
  it("SIGNIN-06 saves the trimmed name and returns the account", async () => {
    const { accountId } = await signIn("maria@example.com");

    const result = await saveName(harness.deps(), accountId, "  Maria Lopez ");

    expect(result).toMatchObject({
      ok: true,
      value: { account: { id: accountId, email: "maria@example.com", name: "Maria Lopez" } },
    });
  });

  it("§7 a new family's first member gets the name and the first color", async () => {
    const { accountId } = await signIn("maria@example.com");

    const result = await saveName(harness.deps(), accountId, "  Maria Lopez ");

    expect(result.ok && result.value.firstMember).toMatchObject({
      name: "Maria Lopez",
      color: "lilac",
    });
    expect(await memberNames()).toEqual([{ account_id: accountId, name: "Maria Lopez" }]);
  });

  it("§7 saving the name again adds no member", async () => {
    const { accountId } = await signIn("maria@example.com");
    await saveName(harness.deps(), accountId, "Maria");

    const result = await saveName(harness.deps(), accountId, "Maria Lopez");

    expect(result.ok && result.value.firstMember).toBeUndefined();
    expect(await memberNames()).toEqual([{ account_id: accountId, name: "Maria" }]);
  });

  it("SIGNIN-06 never writes another account's name", async () => {
    const maria = await signIn("maria@example.com");
    await signIn("sam@example.com");

    await saveName(harness.deps(), maria.accountId, "Maria");

    expect(await accountNames()).toEqual([
      { email: "maria@example.com", name: "Maria" },
      { email: "sam@example.com", name: null },
    ]);
  });

  it("SIGNIN-06 reports an account that doesn't exist", async () => {
    expect(await saveName(harness.deps(), "01890000-0000-7000-8000-000000000000", "Maria")).toEqual(
      {
        ok: false,
        error: "not-found",
      },
    );
  });
});
