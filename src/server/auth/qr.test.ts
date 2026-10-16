import { createHash } from "node:crypto";
import { requestLink, verifyLink } from "./links";
import { issueQrLink, voidQrLink } from "./qr";
import { requireDisplay, type SignedInDisplay, signOut } from "./sessions";
import { APP_URL, authHarnessPerTest, linkToken } from "./testAuth";

const harness = authHarnessPerTest();

const FIVE_MINUTES = 5 * 60 * 1000;

type Opened = SignedInDisplay & { sessionToken: string };

async function signIn(email: string): Promise<Opened> {
  await requestLink(harness.deps(), { email, timeZone: "America/New_York", ip: "203.0.113.5" });

  const verified = await verifyLink(harness.deps(), { token: linkToken(harness.sent.at(-1)) });

  if (!verified.ok) throw new Error(verified.error.code);

  return opened(verified.value.sessionToken);
}

async function opened(sessionToken: string): Promise<Opened> {
  const display = await requireDisplay(harness.deps(), sessionToken);

  if (!display.ok) throw new Error(display.error);

  return { ...display.value, sessionToken };
}

async function issue(display: SignedInDisplay): Promise<string> {
  const issued = await issueQrLink(harness.deps(), display);

  if (!issued.ok) throw new Error(issued.error);

  return new URL(issued.value.url).searchParams.get("t") ?? "";
}

async function scan(token: string, userAgent?: string) {
  const verified = await verifyLink(harness.deps(), { token, userAgent });

  return verified.ok ? opened(verified.value.sessionToken) : verified;
}

describe("issueQrLink", () => {
  it("SIGNIN-15 answers a verify link at APP_URL and stores only its sha256 hash", async () => {
    const maria = await signIn("maria@example.com");

    const issued = await issueQrLink(harness.deps(), maria);

    const url = issued.ok ? issued.value.url : "";
    const token = new URL(url).searchParams.get("t") ?? "";
    expect(url).toBe(`${APP_URL}/api/auth/verify?t=${token}`);
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(
      await harness.deps().db.all("SELECT token_hash, kind FROM magic_links WHERE kind = 'qr'"),
    ).toEqual([{ token_hash: createHash("sha256").update(token).digest("hex"), kind: "qr" }]);
  });

  it("SIGNIN-15 stores the account, the display, no pending id and a 5-minute expiry", async () => {
    const maria = await signIn("maria@example.com");

    await issue(maria);

    expect(
      await harness
        .deps()
        .db.all(
          "SELECT email, account_id, display_id, pending_id, expires_at, used_at FROM magic_links WHERE kind = 'qr'",
        ),
    ).toEqual([
      {
        email: "maria@example.com",
        account_id: maria.accountId,
        display_id: maria.displayId,
        pending_id: null,
        expires_at: "2026-10-09T14:05:00.000Z",
        used_at: null,
      },
    ]);
  });

  it("SIGNIN-15 rate-limits codes per display", async () => {
    const maria = await signIn("maria@example.com");
    for (let i = 0; i < 30; i++) await issue(maria);

    const result = await issueQrLink(harness.deps(), maria);

    expect(result).toEqual({ ok: false, error: "rate-limited" });
  });
});

describe("verifyLink with a QR code", () => {
  it("SIGNIN-15 signs the opener in to the code's own account only", async () => {
    const maria = await signIn("maria@example.com");
    const sam = await signIn("sam@example.com");
    const token = await issue(maria);

    const phone = await scan(token);

    expect("accountId" in phone && phone.accountId).toBe(maria.accountId);
    expect("accountId" in phone && phone.accountId).not.toBe(sam.accountId);
    expect(await harness.deps().db.all("SELECT email FROM accounts ORDER BY email")).toEqual([
      { email: "maria@example.com" },
      { email: "sam@example.com" },
    ]);
  });

  it("SIGNIN-15 opens a new display with the opener's device", async () => {
    const maria = await signIn("maria@example.com");
    const token = await issue(maria);

    const phone = await scan(
      token,
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    );

    const id = "displayId" in phone ? phone.displayId : "";
    expect(id).not.toBe(maria.displayId);
    expect(
      await harness.deps().db.one("SELECT kind, browser FROM displays WHERE id = $1", [id]),
    ).toEqual({ kind: "smartphone", browser: "Safari" });
  });

  it("SIGNIN-15 a code works once", async () => {
    const maria = await signIn("maria@example.com");
    const token = await issue(maria);
    await scan(token);

    expect(await scan(token)).toEqual({ ok: false, error: { code: "stale", email: null } });
  });

  it("SIGNIN-15 a code stops working after 5 minutes", async () => {
    const maria = await signIn("maria@example.com");
    const token = await issue(maria);
    harness.advance(FIVE_MINUTES);

    expect(await scan(token)).toEqual({ ok: false, error: { code: "stale", email: null } });
  });

  it("SIGNIN-15 a code still works just before 5 minutes", async () => {
    const maria = await signIn("maria@example.com");
    const token = await issue(maria);
    harness.advance(FIVE_MINUTES - 1000);

    expect(await scan(token)).toMatchObject({ accountId: maria.accountId });
  });

  it("SIGNIN-15 a newer code voids the older one", async () => {
    const maria = await signIn("maria@example.com");
    const older = await issue(maria);
    const newer = await issue(maria);

    expect(await scan(older)).toEqual({ ok: false, error: { code: "stale", email: null } });
    expect(await scan(newer)).toMatchObject({ accountId: maria.accountId });
  });

  it("SIGNIN-15 a newer code on another screen leaves this screen's code working", async () => {
    const kitchen = await signIn("maria@example.com");
    const hallway = await signIn("maria@example.com");
    const token = await issue(kitchen);
    await issue(hallway);

    expect(await scan(token)).toMatchObject({ accountId: kitchen.accountId });
  });

  it("SIGNIN-15 an email link for the account leaves the open code working", async () => {
    const maria = await signIn("maria@example.com");
    const token = await issue(maria);
    await requestLink(harness.deps(), {
      email: "maria@example.com",
      timeZone: "America/New_York",
      ip: "203.0.113.9",
    });

    expect(await scan(token)).toMatchObject({ accountId: maria.accountId });
  });
});

function codeUrl(token: string): string {
  return `${APP_URL}/api/auth/verify?t=${token}`;
}

describe("voidQrLink", () => {
  it("SIGNIN-15 closing the tile voids the screen's code", async () => {
    const maria = await signIn("maria@example.com");
    const token = await issue(maria);

    await voidQrLink(harness.deps().db, maria, codeUrl(token));

    expect(await scan(token)).toEqual({ ok: false, error: { code: "stale", email: null } });
  });

  it("SIGNIN-15 can't void another account's or another screen's code", async () => {
    const maria = await signIn("maria@example.com");
    const hallway = await signIn("maria@example.com");
    const sam = await signIn("sam@example.com");
    const token = await issue(maria);

    await voidQrLink(harness.deps().db, sam, codeUrl(token));
    await voidQrLink(harness.deps().db, hallway, codeUrl(token));

    expect(await scan(token)).toMatchObject({ accountId: maria.accountId });
  });

  it("SIGNIN-15 voiding an older code leaves the newer one working", async () => {
    const maria = await signIn("maria@example.com");
    const older = await issue(maria);
    const newer = await issue(maria);

    await voidQrLink(harness.deps().db, maria, codeUrl(older));

    expect(await scan(newer)).toMatchObject({ accountId: maria.accountId });
  });

  it("SIGNIN-15 a link without a code voids nothing", async () => {
    const maria = await signIn("maria@example.com");
    const token = await issue(maria);

    await voidQrLink(harness.deps().db, maria, `${APP_URL}/api/auth/verify`);

    expect(await scan(token)).toMatchObject({ accountId: maria.accountId });
  });

  it("SIGNIN-15 signing the screen out removes its code", async () => {
    const maria = await signIn("maria@example.com");
    const token = await issue(maria);

    await signOut(harness.deps().db, maria.sessionToken);

    expect(await scan(token)).toEqual({ ok: false, error: { code: "stale", email: null } });
  });
});
