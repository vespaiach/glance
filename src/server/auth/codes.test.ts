import { createHash } from "node:crypto";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { finishSetup, saveName } from "./account";
import { requestCode, verifyCode } from "./codes";
import { requireDisplay } from "./sessions";
import { authHarnessPerTest, mailedCode } from "./testAuth";

const harness = authHarnessPerTest();

const REQUEST = { email: "Maria@Example.com", timeZone: "America/New_York", ip: "203.0.113.5" };

const TEN_MINUTES = 10 * 60 * 1000;

const TABLET_UA =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

function rows(sql: string): Promise<unknown[]> {
  return harness.deps().db.all(sql);
}

async function sendCode(request = REQUEST): Promise<string> {
  const result = await requestCode(harness.deps(), request);

  if (!result.ok) throw new Error(result.error);

  return mailedCode(harness.sent.at(-1));
}

function enter(code: string, email = "maria@example.com", extra: { userAgent?: string } = {}) {
  return verifyCode(harness.deps(), { email, code, ip: "198.51.100.7", ...extra });
}

function wrongCode(code: string): string {
  return code === "000000" ? "000001" : "000000";
}

async function saveSeason(season: string): Promise<void> {
  await harness
    .deps()
    .db.run(
      "INSERT INTO settings (account_id, json, updated_at, version) SELECT id, $1, $2, 1 FROM accounts",
      [JSON.stringify({ ...DEFAULT_SETTINGS, season }), "2026-10-09T14:00:00.000Z"],
    );
}

describe("requestCode", () => {
  it("SIGNIN-12 emails a 6-digit code and stores only sha256 of the email and code", async () => {
    const code = await sendCode();

    expect(code).toMatch(/^\d{6}$/);
    expect(harness.sent[0]?.to).toBe("maria@example.com");
    expect(await rows("SELECT code_hash FROM sign_in_codes")).toEqual([
      { code_hash: createHash("sha256").update(`maria@example.com:${code}`).digest("hex") },
    ]);
  });

  it("SIGNIN-12 stores the time zone, no tries and a 10-minute expiry", async () => {
    await sendCode();

    expect(await rows("SELECT email, time_zone, tries, expires_at FROM sign_in_codes")).toEqual([
      {
        email: "maria@example.com",
        time_zone: "America/New_York",
        tries: 0,
        expires_at: "2026-10-09T14:10:00.000Z",
      },
    ]);
  });

  it("SIGNIN-04 answers the same for a known and an unknown email", async () => {
    const unknown = await requestCode(harness.deps(), REQUEST);
    await enter(mailedCode(harness.sent.at(-1)));

    const known = await requestCode(harness.deps(), REQUEST);

    expect(unknown).toEqual({ ok: true, value: undefined });
    expect(known).toEqual({ ok: true, value: undefined });
  });

  it("SIGNIN-12 a new code voids the older one", async () => {
    const older = await sendCode();
    const newer = await sendCode();

    expect(await rows("SELECT email FROM sign_in_codes")).toHaveLength(1);
    expect(await enter(older)).toEqual({ ok: false, error: "wrong-code" });
    expect((await enter(newer)).ok).toBe(true);
  });

  it("SIGNIN-12 a new code resets the tries", async () => {
    const older = await sendCode();
    for (let i = 0; i < 5; i++) await enter(wrongCode(older));

    const newer = await sendCode();

    expect((await enter(newer)).ok).toBe(true);
  });

  it("SIGNIN-12 a new code leaves other emails' codes alone", async () => {
    await sendCode();

    await sendCode({ ...REQUEST, email: "sam@example.com" });

    expect(await rows("SELECT email FROM sign_in_codes ORDER BY email")).toEqual([
      { email: "maria@example.com" },
      { email: "sam@example.com" },
    ]);
  });

  it("tech§6.2 rate-limits codes per email and sends nothing over the limit", async () => {
    for (let i = 0; i < 5; i++) await sendCode({ ...REQUEST, ip: `198.51.100.${i}` });

    const result = await requestCode(harness.deps(), { ...REQUEST, ip: "198.51.100.9" });

    expect(result).toEqual({ ok: false, error: "rate-limited" });
    expect(harness.sent).toHaveLength(5);
  });

  it("tech§6.2 rate-limits codes per IP", async () => {
    for (let i = 0; i < 20; i++) await sendCode({ ...REQUEST, email: `p${i}@example.com` });

    const result = await requestCode(harness.deps(), { ...REQUEST, email: "late@example.com" });

    expect(result).toEqual({ ok: false, error: "rate-limited" });
  });

  it("SIGNIN-03 reports a failed send", async () => {
    harness.failMail();

    expect(await requestCode(harness.deps(), REQUEST)).toEqual({
      ok: false,
      error: "mail-failed",
    });
  });
});

describe("requestCode season", () => {
  it("SIGNIN-12 the email takes the account's fixed season", async () => {
    await enter(await sendCode());
    await saveSeason("winter");

    await sendCode();

    expect(harness.sent.at(-1)?.html).toContain('class="hero" bgcolor="#d5e4f1"');
  });

  it("SIGNIN-12 with an auto season the email takes the send date's season in the request's time zone", async () => {
    await enter(await sendCode());
    await saveSeason("auto");
    harness.advance(
      Date.parse("2026-12-01T03:00:00.000Z") - Date.parse("2026-10-09T14:00:00.000Z"),
    );

    await sendCode();
    await sendCode({ ...REQUEST, timeZone: "UTC" });

    expect(harness.sent.at(-2)?.html).toContain('class="hero" bgcolor="#f0c987"');
    expect(harness.sent.at(-1)?.html).toContain('class="hero" bgcolor="#d5e4f1"');
  });

  it("SIGNIN-12 a new email takes the send date's season", async () => {
    await sendCode();

    expect(harness.sent.at(-1)?.html).toContain('class="hero" bgcolor="#f0c987"');
  });
});

describe("verifyCode", () => {
  it("SIGNIN-12 the right code for an unknown email creates the account with the code's time zone and no name", async () => {
    const code = await sendCode();

    const result = await enter(code);

    expect(result.ok && result.value.status).toEqual({
      state: "signed-in",
      account: { id: expect.any(String), email: "maria@example.com", name: null },
      returning: false,
      setupDone: false,
    });
    expect(await rows("SELECT email, name, time_zone, created_at FROM accounts")).toEqual([
      {
        email: "maria@example.com",
        name: null,
        time_zone: "America/New_York",
        created_at: "2026-10-09T14:00:00.000Z",
      },
    ]);
  });

  it("SIGNIN-12 signs the screen in with a session for the account", async () => {
    const result = await enter(await sendCode());

    const display = await requireDisplay(
      harness.deps(),
      result.ok ? result.value.sessionToken : "",
    );
    expect(display.ok && display.value.accountId).toBe(result.ok && result.value.status.account.id);
  });

  it("D23 the display records the screen's device kind and browser", async () => {
    await enter(await sendCode(), "maria@example.com", { userAgent: TABLET_UA });

    expect(await rows("SELECT kind, browser FROM displays")).toEqual([
      { kind: "tablet", browser: "Chrome" },
    ]);
  });

  it("SIGNIN-12 a known email signs in to the existing account as returning", async () => {
    const first = await enter(await sendCode());
    const accountId = first.ok ? first.value.status.account.id : "";
    await saveName(harness.deps(), accountId, "Maria");
    await finishSetup(harness.deps(), accountId);
    harness.advance(60_000);

    const again = await enter(await sendCode({ ...REQUEST, timeZone: "Europe/Paris" }));

    expect(again.ok && again.value.status).toEqual({
      state: "signed-in",
      account: { id: accountId, email: "maria@example.com", name: "Maria" },
      returning: true,
      setupDone: true,
    });
    expect(await rows("SELECT time_zone FROM accounts")).toEqual([
      { time_zone: "America/New_York" },
    ]);
    expect(await rows("SELECT id FROM displays")).toHaveLength(2);
  });

  it("SIGNIN-12 reads the email trimmed and without case", async () => {
    const code = await sendCode();

    expect((await enter(code, "  MARIA@example.com ")).ok).toBe(true);
  });

  it("SIGNIN-12 a code works once", async () => {
    const code = await sendCode();
    await enter(code);

    expect(await enter(code)).toEqual({ ok: false, error: "code-expired" });
    expect(await rows("SELECT email FROM sign_in_codes")).toEqual([]);
  });

  it("SIGNIN-17 a wrong code is refused and counts a try", async () => {
    const code = await sendCode();

    expect(await enter(wrongCode(code))).toEqual({ ok: false, error: "wrong-code" });
    expect(await rows("SELECT tries FROM sign_in_codes")).toEqual([{ tries: 1 }]);
    expect(await rows("SELECT id FROM accounts")).toEqual([]);
  });

  it("SIGNIN-17 the right code after 4 wrong tries still signs in", async () => {
    const code = await sendCode();
    for (let i = 0; i < 4; i++) await enter(wrongCode(code));

    expect((await enter(code)).ok).toBe(true);
  });

  it("SIGNIN-17 the 5th wrong try locks the code, and the right code no longer works", async () => {
    const code = await sendCode();
    for (let i = 0; i < 4; i++) await enter(wrongCode(code));

    expect(await enter(wrongCode(code))).toEqual({ ok: false, error: "code-locked" });
    expect(await enter(code)).toEqual({ ok: false, error: "code-locked" });
    expect(await rows("SELECT id FROM accounts")).toEqual([]);
  });

  it("SIGNIN-08 a code stops working after 10 minutes", async () => {
    const code = await sendCode();
    harness.advance(TEN_MINUTES);

    expect(await enter(code)).toEqual({ ok: false, error: "code-expired" });
    expect(await rows("SELECT id FROM accounts")).toEqual([]);
  });

  it("SIGNIN-08 an email with no code reads the same as an expired code", async () => {
    expect(await enter("123456", "nobody@example.com")).toEqual({
      ok: false,
      error: "code-expired",
    });
  });

  it("SIGNIN-12 another email's code never works", async () => {
    const marias = await sendCode();
    const sams = await sendCode({ ...REQUEST, email: "sam@example.com" });

    expect(await enter(marias, "sam@example.com")).toEqual({ ok: false, error: "wrong-code" });
    expect((await enter(sams, "sam@example.com")).ok).toBe(true);
    expect(await enter(marias, "omar@example.com")).toEqual({ ok: false, error: "code-expired" });
    expect(await rows("SELECT email FROM accounts")).toEqual([{ email: "sam@example.com" }]);
  });

  it("tech§6.2 rate-limits tries per IP", async () => {
    const code = await sendCode();
    for (let i = 0; i < 30; i++) await enter("123456", `p${i}@example.com`);

    expect(await enter(code)).toEqual({ ok: false, error: "rate-limited" });
  });
});
