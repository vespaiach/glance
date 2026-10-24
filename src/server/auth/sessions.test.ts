import { saveName } from "./account";
import { issueQrLink } from "./qr";
import { requireDisplay, type SignedInDisplay, signOut, signOutAll } from "./sessions";
import { authHarnessPerTest, signIn as signInWithCode } from "./testAuth";
import { hashToken } from "./tokens";

const harness = authHarnessPerTest();

function signIn(email: string): Promise<SignedInDisplay & { sessionToken: string }> {
  return signInWithCode(harness, email);
}

async function accountName(email: string): Promise<string | null | undefined> {
  return (await harness.deps().db.accounts.byEmail(email))?.name;
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
    const { sessionToken, accountId } = await signIn("maria@example.com");
    harness.advance(5000);

    const display = await requireDisplay(harness.deps(), sessionToken);

    const [row] = await harness.deps().db.displays.forAccount(accountId);
    expect(display).toEqual({ ok: true, value: { displayId: row?.id, accountId } });
    expect(row).toMatchObject({ lastSeenAt: "2026-10-09T14:00:05.000Z" });
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

    expect(await harness.deps().db.displays.forAccount(kitchen.accountId)).toEqual([]);
  });

  it("SIGNIN-11 does nothing without a session", async () => {
    await expect(signOut(harness.deps().db, undefined)).resolves.toBeUndefined();
  });
});

async function subscribe(display: SignedInDisplay, endpoint: string): Promise<void> {
  await harness.deps().db.pushSubscriptions.save({
    id: endpoint,
    accountId: display.accountId,
    displayId: display.displayId,
    endpoint,
    keys: { p256dh: "p256dh-key", auth: "auth-secret" },
    createdAt: "2026-10-09T14:00:00.000Z",
  });
}

async function qrToken(display: SignedInDisplay): Promise<string> {
  const issued = await issueQrLink(harness.deps(), display);

  if (!issued.ok) throw new Error(issued.error);

  return new URL(issued.value.url).searchParams.get("t") ?? "";
}

describe("signOutAll", () => {
  it("SIGNIN-11 ends every session of the account and none of another", async () => {
    const kitchen = await signIn("maria@example.com");
    const hall = await signIn("maria@example.com");
    const sam = await signIn("sam@example.com");

    await signOutAll(harness.deps(), kitchen.accountId);

    expect((await requireDisplay(harness.deps(), kitchen.sessionToken)).ok).toBe(false);
    expect((await requireDisplay(harness.deps(), hall.sessionToken)).ok).toBe(false);
    expect((await requireDisplay(harness.deps(), sam.sessionToken)).ok).toBe(true);
  });

  it("SIGNIN-18 a revoked session's next request is refused as revoked", async () => {
    const kitchen = await signIn("maria@example.com");

    await signOutAll(harness.deps(), kitchen.accountId);

    expect(await requireDisplay(harness.deps(), kitchen.sessionToken)).toEqual({
      ok: false,
      error: "revoked",
    });
  });

  it("SIGNIN-11 removes the account's screens, QR codes and push subscriptions and keeps another's", async () => {
    const kitchen = await signIn("maria@example.com");
    const sam = await signIn("sam@example.com");
    await subscribe(kitchen, "https://push.example.com/kitchen");
    await subscribe(sam, "https://push.example.com/sam");
    const kitchenQr = await qrToken(kitchen);
    const samQr = await qrToken(sam);

    await signOutAll(harness.deps(), kitchen.accountId);

    const { db } = harness.deps();
    expect(await db.displays.forAccount(kitchen.accountId)).toEqual([]);
    expect(await db.pushSubscriptions.forAccount(kitchen.accountId)).toEqual([]);
    expect(await db.magicLinks.get(hashToken(kitchenQr))).toBeUndefined();
    expect(await db.displays.forAccount(sam.accountId)).toHaveLength(1);
    expect(await db.pushSubscriptions.forAccount(sam.accountId)).toHaveLength(1);
    expect(await db.magicLinks.get(hashToken(samQr))).toBeDefined();
  });

  it("SIGNIN-12 the same email can sign in again after signing out everywhere", async () => {
    const kitchen = await signIn("maria@example.com");
    await signOutAll(harness.deps(), kitchen.accountId);

    const again = await signIn("maria@example.com");

    expect(again.accountId).toBe(kitchen.accountId);
    expect((await requireDisplay(harness.deps(), again.sessionToken)).ok).toBe(true);
  });
});

async function tagNames(accountId: string): Promise<string[]> {
  return (await harness.deps().db.tags.changedSince(accountId, 0)).map((tag) => tag.name);
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

  it("§7 a new family's first tag gets the name and the first color", async () => {
    const { accountId } = await signIn("maria@example.com");

    const result = await saveName(harness.deps(), accountId, "  Maria Lopez ");

    expect(result.ok && result.value.firstTag).toMatchObject({
      name: "Maria Lopez",
      color: "lilac",
    });
    expect(await tagNames(accountId)).toEqual(["Maria Lopez"]);
  });

  it("§7 saving the name again adds no tag", async () => {
    const { accountId } = await signIn("maria@example.com");
    await saveName(harness.deps(), accountId, "Maria");

    const result = await saveName(harness.deps(), accountId, "Maria Lopez");

    expect(result.ok && result.value.firstTag).toBeUndefined();
    expect(await tagNames(accountId)).toEqual(["Maria"]);
  });

  it("SIGNIN-06 never writes another account's name", async () => {
    const maria = await signIn("maria@example.com");
    await signIn("sam@example.com");

    await saveName(harness.deps(), maria.accountId, "Maria");

    expect(await accountName("maria@example.com")).toBe("Maria");
    expect(await accountName("sam@example.com")).toBeNull();
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
