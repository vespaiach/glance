import { createHash } from "node:crypto";
import { requestLink, verifyLink } from "./links";
import { requireDisplay } from "./sessions";
import { APP_URL, authHarnessPerTest, linkToken } from "./testAuth";

const harness = authHarnessPerTest();

const REQUEST = { email: "Maria@Example.com", timeZone: "America/New_York", ip: "203.0.113.5" };

const TEN_MINUTES = 10 * 60 * 1000;

function rows(sql: string): unknown[] {
  return harness.deps().db.prepare(sql).all();
}

async function sendLink(request = REQUEST): Promise<{ token: string; pendingId: string }> {
  const result = await requestLink(harness.deps(), request);

  if (!result.ok) throw new Error(result.error);

  return { token: linkToken(harness.sent.at(-1)), pendingId: result.value.pendingId };
}

describe("requestLink", () => {
  it("SIGNIN-12 emails a link to APP_URL and stores only its sha256 hash", async () => {
    const { token } = await sendLink();

    expect(harness.sent).toHaveLength(1);
    expect(harness.sent[0]?.to).toBe("maria@example.com");
    expect(harness.sent[0]?.text).toContain(`${APP_URL}/api/auth/verify?t=${token}`);
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(rows("SELECT token_hash FROM magic_links")).toEqual([
      { token_hash: createHash("sha256").update(token).digest("hex") },
    ]);
  });

  it("SIGNIN-12 stores the pending id, the time zone and a 10-minute expiry", async () => {
    const { pendingId } = await sendLink();

    expect(
      rows("SELECT email, pending_id, time_zone, expires_at, used_at FROM magic_links"),
    ).toEqual([
      {
        email: "maria@example.com",
        pending_id: pendingId,
        time_zone: "America/New_York",
        expires_at: "2026-10-09T14:10:00.000Z",
        used_at: null,
      },
    ]);
  });

  it("SIGNIN-04 answers the same for a known and an unknown email", async () => {
    const first = await requestLink(harness.deps(), REQUEST);
    const { token } = await sendLink();
    verifyLink(harness.deps(), { token });

    const known = await requestLink(harness.deps(), REQUEST);

    expect(first.ok && known.ok).toBe(true);
    expect(Object.keys(first.ok ? first.value : {})).toEqual(["pendingId"]);
    expect(Object.keys(known.ok ? known.value : {})).toEqual(["pendingId"]);
  });

  it("SIGNIN-12 a new link voids the older unused links for that email", async () => {
    await sendLink();

    const { pendingId } = await sendLink({ ...REQUEST, email: "maria@example.com" });

    expect(rows("SELECT pending_id FROM magic_links")).toEqual([{ pending_id: pendingId }]);
  });

  it("SIGNIN-12 a new link leaves other emails' links alone", async () => {
    await sendLink();

    await sendLink({ ...REQUEST, email: "sam@example.com" });

    expect(rows("SELECT email FROM magic_links ORDER BY email")).toEqual([
      { email: "maria@example.com" },
      { email: "sam@example.com" },
    ]);
  });

  it("tech§6.2 rate-limits links per email and sends nothing over the limit", async () => {
    for (let i = 0; i < 5; i++) await sendLink({ ...REQUEST, ip: `198.51.100.${i}` });

    const result = await requestLink(harness.deps(), { ...REQUEST, ip: "198.51.100.9" });

    expect(result).toEqual({ ok: false, error: "rate-limited" });
    expect(harness.sent).toHaveLength(5);
  });

  it("tech§6.2 rate-limits links per IP", async () => {
    for (let i = 0; i < 20; i++) await sendLink({ ...REQUEST, email: `p${i}@example.com` });

    const result = await requestLink(harness.deps(), { ...REQUEST, email: "late@example.com" });

    expect(result).toEqual({ ok: false, error: "rate-limited" });
  });

  it("SIGNIN-03 reports a failed send", async () => {
    harness.failMail();

    const result = await requestLink(harness.deps(), REQUEST);

    expect(result).toEqual({ ok: false, error: "mail-failed" });
  });
});

describe("verifyLink", () => {
  it("SIGNIN-12 an unknown email's link creates the account with the link's time zone and no name", async () => {
    const { token } = await sendLink();

    const result = verifyLink(harness.deps(), { token });

    expect(result.ok).toBe(true);
    expect(rows("SELECT email, name, time_zone, created_at FROM accounts")).toEqual([
      {
        email: "maria@example.com",
        name: null,
        time_zone: "America/New_York",
        created_at: "2026-10-09T14:00:00.000Z",
      },
    ]);
  });

  it("SIGNIN-12 signs the opening device in with a session for the account", async () => {
    const { token } = await sendLink();

    const result = verifyLink(harness.deps(), { token });

    const sessionToken = result.ok ? result.value.sessionToken : undefined;
    const display = requireDisplay(harness.deps(), sessionToken);
    const [account] = rows("SELECT id FROM accounts") as { id: string }[];
    expect(display.ok && display.value.accountId).toBe(account?.id);
  });

  it("SIGNIN-12 a known email's link signs in to the existing account", async () => {
    verifyLink(harness.deps(), await sendLink());

    verifyLink(harness.deps(), await sendLink({ ...REQUEST, timeZone: "Europe/Paris" }));

    expect(rows("SELECT time_zone FROM accounts")).toEqual([{ time_zone: "America/New_York" }]);
    expect(rows("SELECT id FROM displays")).toHaveLength(2);
  });

  it("SIGNIN-12 a link works once", async () => {
    const { token } = await sendLink();
    verifyLink(harness.deps(), { token });

    const again = verifyLink(harness.deps(), { token });

    expect(again).toEqual({ ok: false, error: { code: "stale", email: "maria@example.com" } });
  });

  it("SIGNIN-12 a link stops working after 10 minutes", async () => {
    const { token } = await sendLink();
    harness.advance(TEN_MINUTES);

    const result = verifyLink(harness.deps(), { token });

    expect(result).toEqual({ ok: false, error: { code: "stale", email: "maria@example.com" } });
    expect(rows("SELECT id FROM accounts")).toEqual([]);
  });

  it("SIGNIN-12 a voided link doesn't work", async () => {
    const { token } = await sendLink();
    await sendLink();

    const result = verifyLink(harness.deps(), { token });

    expect(result).toEqual({ ok: false, error: { code: "stale", email: null } });
  });

  it("SIGNIN-12 an unknown token is stale", () => {
    expect(verifyLink(harness.deps(), { token: "nope" })).toEqual({
      ok: false,
      error: { code: "stale", email: null },
    });
  });

  it("tech§6.2 the waiting screen that opens its own link gets one display", async () => {
    const { token, pendingId } = await sendLink();

    verifyLink(harness.deps(), { token, pendingId });

    expect(rows("SELECT id FROM displays")).toHaveLength(1);
    expect(rows("SELECT token_hash FROM magic_links")).toEqual([]);
  });
});
