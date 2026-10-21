import { finishSetup, saveName } from "./account";
import { authStatus } from "./status";
import { authHarnessPerTest, signIn } from "./testAuth";

const harness = authHarnessPerTest();

describe("authStatus", () => {
  it("SIGNIN-06 a new account's screen is signed in with no name yet", async () => {
    const screen = await signIn(harness, "maria@example.com");

    expect(await authStatus(harness.deps(), screen.sessionToken)).toEqual({
      state: "signed-in",
      account: { id: screen.accountId, email: "maria@example.com", name: null },
      returning: false,
      setupDone: false,
    });
  });

  it("SIGNIN-09 a known account's new screen is returning", async () => {
    const first = await signIn(harness, "maria@example.com");
    await saveName(harness.deps(), first.accountId, "Maria");
    await finishSetup(harness.deps(), first.accountId);
    harness.advance(60_000);

    const screen = await signIn(harness, "maria@example.com");

    expect(await authStatus(harness.deps(), screen.sessionToken)).toMatchObject({
      state: "signed-in",
      account: { name: "Maria" },
      returning: true,
      setupDone: true,
    });
  });

  it("SIGNIN-14 a named account whose location step never ended is not set up", async () => {
    const first = await signIn(harness, "maria@example.com");
    await saveName(harness.deps(), first.accountId, "Maria");

    expect(await authStatus(harness.deps(), first.sessionToken)).toMatchObject({
      state: "signed-in",
      setupDone: false,
    });
  });

  it("tech§6.2 is signed out with no session or an unknown one", async () => {
    expect(await authStatus(harness.deps(), undefined)).toEqual({ state: "signed-out" });
    expect(await authStatus(harness.deps(), "forged")).toEqual({ state: "signed-out" });
  });
});
