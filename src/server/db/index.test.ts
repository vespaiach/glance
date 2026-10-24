import { createDatabase } from ".";

describe("createDatabase", () => {
  it("D7 DB=memory runs the migrations on an in-process PostgreSQL", async () => {
    const { db, prepare } = createDatabase({ kind: "memory" });

    await prepare();

    expect(await db.versions.next()).toBe(1);
    expect(await db.tags.hasAny("0192f3a0-0000-7000-8000-000000000001")).toBe(false);
  });
});
