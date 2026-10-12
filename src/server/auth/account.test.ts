import { accountById, finishSetup } from "./account";
import { authHarnessPerTest, START } from "./testAuth";

const harness = authHarnessPerTest();

const MARIA = "0192f3a0-0000-7000-8000-000000000001";

const OMAR = "0192f3a0-0000-7000-8000-000000000002";

function addAccounts() {
  const insert = harness
    .deps()
    .db.prepare(
      "INSERT INTO accounts (id, email, time_zone, created_at) VALUES (?, ?, 'America/New_York', ?)",
    );

  insert.run(MARIA, "maria@example.com", START.toISOString());
  insert.run(OMAR, "omar@example.com", START.toISOString());
}

const setupDoneAt = (accountId: string) => accountById(harness.deps().db, accountId)?.setup_done_at;

describe("finishSetup", () => {
  it("SIGNIN-14 records when the account's first setup ended", () => {
    addAccounts();
    harness.advance(60_000);

    finishSetup(harness.deps(), MARIA);

    expect(setupDoneAt(MARIA)).toBe("2026-10-09T14:01:00.000Z");
  });

  it("SIGNIN-14 keeps the first end when the step ends again", () => {
    addAccounts();
    finishSetup(harness.deps(), MARIA);
    harness.advance(60_000);

    finishSetup(harness.deps(), MARIA);

    expect(setupDoneAt(MARIA)).toBe(START.toISOString());
  });

  it("tech§5 ends only its own account's setup", () => {
    addAccounts();

    finishSetup(harness.deps(), MARIA);

    expect(setupDoneAt(OMAR)).toBeNull();
  });
});
