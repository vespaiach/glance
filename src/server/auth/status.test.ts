import { finishSetup, saveName } from "./account";
import { requestLink, verifyLink } from "./links";
import { requireDisplay } from "./sessions";
import { authStatus } from "./status";
import { authHarnessPerTest, linkToken } from "./testAuth";

const harness = authHarnessPerTest();

const PHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

const REQUEST = { email: "maria@example.com", timeZone: "America/New_York", ip: "203.0.113.5" };

async function waitingScreen(): Promise<{ token: string; pendingId: string }> {
  const result = await requestLink(harness.deps(), REQUEST);

  if (!result.ok) throw new Error(result.error);

  return { token: linkToken(harness.sent.at(-1)), pendingId: result.value.pendingId };
}

async function openElsewhere(token: string): Promise<{ sessionToken: string; accountId: string }> {
  const verified = await verifyLink(harness.deps(), { token });

  if (!verified.ok) throw new Error(verified.error.code);

  const display = await requireDisplay(harness.deps(), verified.value.sessionToken);

  if (!display.ok) throw new Error(display.error);

  return { sessionToken: verified.value.sessionToken, accountId: display.value.accountId };
}

describe("authStatus on the waiting screen", () => {
  it("SIGNIN-04 is waiting until the link is opened", async () => {
    const { pendingId } = await waitingScreen();

    expect(await authStatus(harness.deps(), { pendingId })).toEqual({
      status: { state: "waiting" },
    });
  });

  it("SIGNIN-08 is expired 10 minutes after the link was sent unopened", async () => {
    const { pendingId } = await waitingScreen();
    harness.advance(10 * 60 * 1000);

    expect(await authStatus(harness.deps(), { pendingId })).toEqual({
      status: { state: "expired", email: "maria@example.com" },
    });
  });

  it("SIGNIN-08 is expired once a newer link voided this one", async () => {
    const { pendingId } = await waitingScreen();
    await waitingScreen();

    expect(await authStatus(harness.deps(), { pendingId })).toEqual({
      status: { state: "expired" },
    });
  });

  it("SIGNIN-07 waits for the name when a new account's link opened on another device", async () => {
    const { token, pendingId } = await waitingScreen();
    await openElsewhere(token);

    expect(await authStatus(harness.deps(), { pendingId })).toEqual({
      status: { state: "finishing-elsewhere" },
    });
  });

  it("SIGNIN-07 keeps waiting after the name until the location step ends", async () => {
    const { token, pendingId } = await waitingScreen();
    const opener = await openElsewhere(token);
    await saveName(harness.deps().db, opener.accountId, "Maria");

    expect(await authStatus(harness.deps(), { pendingId })).toEqual({
      status: { state: "finishing-elsewhere" },
    });
  });

  it("SIGNIN-09 signs in with its own session once the name is saved", async () => {
    const { token, pendingId } = await waitingScreen();
    const opener = await openElsewhere(token);
    await saveName(harness.deps().db, opener.accountId, "Maria");
    await finishSetup(harness.deps(), opener.accountId);
    harness.advance(4000);

    const answer = await authStatus(harness.deps(), { pendingId });

    expect(answer.status).toEqual({
      state: "signed-in",
      account: { id: opener.accountId, email: "maria@example.com", name: "Maria" },
      returning: false,
      setupDone: true,
    });
    expect(answer.sessionToken).not.toBe(opener.sessionToken);
    const display = await requireDisplay(harness.deps(), answer.sessionToken);
    expect(display.ok && display.value.accountId).toBe(opener.accountId);
  });

  it("D23 the display the waiting screen claims records that screen's device", async () => {
    const { token, pendingId } = await waitingScreen();
    const opener = await openElsewhere(token);
    await saveName(harness.deps().db, opener.accountId, "Maria");
    await finishSetup(harness.deps(), opener.accountId);

    const answer = await authStatus(harness.deps(), { pendingId, userAgent: PHONE_UA });

    const display = await requireDisplay(harness.deps(), answer.sessionToken);
    expect(
      await harness
        .deps()
        .db.one("SELECT kind, browser FROM displays WHERE id = $1", [
          display.ok && display.value.displayId,
        ]),
    ).toEqual({ kind: "smartphone", browser: "Safari" });
  });

  it("SIGNIN-09 says returning when the account already existed", async () => {
    const first = await waitingScreen();
    const opener = await openElsewhere(first.token);
    await saveName(harness.deps().db, opener.accountId, "Maria");
    await finishSetup(harness.deps(), opener.accountId);
    harness.advance(60_000);
    const { token, pendingId } = await waitingScreen();
    await openElsewhere(token);

    const answer = await authStatus(harness.deps(), { pendingId });

    expect(answer.status).toMatchObject({ state: "signed-in", returning: true });
  });

  it("tech§6.2 the pending id signs in only once", async () => {
    const { token, pendingId } = await waitingScreen();
    const opener = await openElsewhere(token);
    await saveName(harness.deps().db, opener.accountId, "Maria");
    await finishSetup(harness.deps(), opener.accountId);
    await authStatus(harness.deps(), { pendingId });

    expect(await authStatus(harness.deps(), { pendingId })).toEqual({
      status: { state: "expired" },
    });
  });

  it("SIGNIN-08 is expired with no pending id", async () => {
    expect(await authStatus(harness.deps(), {})).toEqual({ status: { state: "expired" } });
  });
});

describe("authStatus with a session", () => {
  it("SIGNIN-06 the opener of a new account is signed in with no name yet", async () => {
    const { token } = await waitingScreen();
    const opener = await openElsewhere(token);

    expect(await authStatus(harness.deps(), { sessionToken: opener.sessionToken })).toEqual({
      status: {
        state: "signed-in",
        account: { id: opener.accountId, email: "maria@example.com", name: null },
        returning: false,
        setupDone: false,
      },
    });
  });

  it("SIGNIN-09 the opener of a known account is returning", async () => {
    const first = await openElsewhere((await waitingScreen()).token);
    await saveName(harness.deps().db, first.accountId, "Maria");
    await finishSetup(harness.deps(), first.accountId);
    harness.advance(60_000);

    const opener = await openElsewhere((await waitingScreen()).token);

    expect(
      (await authStatus(harness.deps(), { sessionToken: opener.sessionToken })).status,
    ).toMatchObject({
      state: "signed-in",
      account: { name: "Maria" },
      returning: true,
      setupDone: true,
    });
  });

  it("SIGNIN-14 a named account whose location step never ended is not set up", async () => {
    const first = await openElsewhere((await waitingScreen()).token);
    await saveName(harness.deps().db, first.accountId, "Maria");
    harness.advance(60_000);

    const opener = await openElsewhere((await waitingScreen()).token);

    expect(
      (await authStatus(harness.deps(), { sessionToken: opener.sessionToken })).status,
    ).toMatchObject({
      state: "signed-in",
      account: { name: "Maria" },
      setupDone: false,
    });
  });

  it("SIGNIN-12 a stale link's email is reported to the device that opened it", async () => {
    expect(await authStatus(harness.deps(), { linkEmail: "maria@example.com" })).toEqual({
      status: { state: "expired", email: "maria@example.com" },
    });
  });
});
