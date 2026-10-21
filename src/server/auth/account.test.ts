import { newAccount } from "../services/testServices";
import { finishSetup } from "./account";
import { authHarnessPerTest, START } from "./testAuth";

const harness = authHarnessPerTest();

const MARIA = "0192f3a0-0000-7000-8000-000000000001";

const OMAR = "0192f3a0-0000-7000-8000-000000000002";

async function addAccounts(): Promise<void> {
  await harness.deps().db.accounts.insert(newAccount(MARIA, "maria@example.com"));
  await harness.deps().db.accounts.insert(newAccount(OMAR, "omar@example.com"));
}

const setupDoneAt = async (accountId: string) =>
  (await harness.deps().db.accounts.byId(accountId))?.setupDoneAt;

describe("finishSetup", () => {
  it("SIGNIN-14 records when the account's first setup ended", async () => {
    await addAccounts();
    harness.advance(60_000);

    await finishSetup(harness.deps(), MARIA);

    expect(await setupDoneAt(MARIA)).toBe("2026-10-09T14:01:00.000Z");
  });

  it("SIGNIN-14 keeps the first end when the step ends again", async () => {
    await addAccounts();
    await finishSetup(harness.deps(), MARIA);
    harness.advance(60_000);

    await finishSetup(harness.deps(), MARIA);

    expect(await setupDoneAt(MARIA)).toBe(START.toISOString());
  });

  it("tech§5 ends only its own account's setup", async () => {
    await addAccounts();

    await finishSetup(harness.deps(), MARIA);

    expect(await setupDoneAt(OMAR)).toBeNull();
  });
});
