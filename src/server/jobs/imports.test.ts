import { MARIA, START, serviceHarnessPerTest } from "../services/testServices";
import { removeStagedImports } from "./imports";

const harness = serviceHarnessPerTest();

const MINUTE_MS = 60 * 1000;

const EPOCH = new Date(0).toISOString();

async function stage(id: string, displayId: string): Promise<void> {
  const { db, now } = harness.deps();

  await db.displays.insert({
    id: displayId,
    accountId: MARIA,
    kind: "monitor",
    browser: null,
    lastSeenAt: START.toISOString(),
  });
  await db.imports.insert({
    id,
    accountId: MARIA,
    forDisplayId: displayId,
    fileName: "school.ics",
    bytes: 10,
    events: [],
    range: { first: "2026-10-09", last: "2026-10-09" },
    createdAt: now().toISOString(),
  });
}

describe("removeStagedImports", () => {
  it("tech§6.4 removes imports still staged an hour after they were made and keeps newer ones", async () => {
    await stage("old", "d1");
    harness.advance(30 * MINUTE_MS);
    await stage("new", "d2");
    harness.advance(30 * MINUTE_MS);

    await removeStagedImports(harness.deps());

    const { db } = harness.deps();
    expect(await db.imports.newestStaged(MARIA, "d1", EPOCH)).toBeUndefined();
    expect((await db.imports.newestStaged(MARIA, "d2", EPOCH))?.id).toBe("new");
  });
});
