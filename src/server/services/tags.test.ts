import type { Tag } from "@/domain/schemas";
import { addFirstTag, putTag } from "./tags";
import { MARIA, OMAR, serviceHarnessPerTest } from "./testServices";

const harness = serviceHarnessPerTest();

const MOM: Tag = {
  id: "0192f3a0-3333-7000-8000-000000000001",
  name: "Mom",
  color: "coral",
  createdAt: "2026-10-01T15:00:00.000Z",
};

const DAD: Tag = {
  id: "0192f3a0-3333-7000-8000-000000000002",
  name: "Dad",
  color: "mint",
  createdAt: "2026-10-01T15:01:00.000Z",
};

describe("putTag", () => {
  it("SYNC-01 saves a new tag stamped with the server time and the next version", async () => {
    const saved = await putTag(harness.deps(), MARIA, MOM);

    expect(saved).toEqual({
      ok: true,
      value: { ...MOM, updatedAt: "2026-10-09T14:00:00.000Z", version: 1 },
    });
    expect(await harness.globalVersion()).toBe(1);
  });

  it("D24 a repeated put of the same tag answers the stored tag and bumps nothing", async () => {
    const first = await putTag(harness.deps(), MARIA, MOM);
    harness.advance(60_000);

    const again = await putTag(harness.deps(), MARIA, MOM);

    expect(again).toEqual(first);
    expect(await harness.globalVersion()).toBe(1);
  });

  it("FAM-07 refuses renaming a tag", async () => {
    await putTag(harness.deps(), MARIA, MOM);

    const saved = await putTag(harness.deps(), MARIA, { ...MOM, name: "Mother" });

    expect(saved).toEqual({ ok: false, error: "tag-changed" });
    expect(await harness.globalVersion()).toBe(1);
  });

  it("FAM-07 refuses recoloring a tag", async () => {
    await putTag(harness.deps(), MARIA, MOM);

    const saved = await putTag(harness.deps(), MARIA, { ...MOM, color: "sun" });

    expect(saved).toEqual({ ok: false, error: "tag-changed" });
  });

  it("FAM-04 refuses a name another tag already has, ignoring case", async () => {
    await putTag(harness.deps(), MARIA, MOM);

    const saved = await putTag(harness.deps(), MARIA, { ...DAD, name: "mOM" });

    expect(saved).toEqual({ ok: false, error: "name-taken" });
    expect(await harness.globalVersion()).toBe(1);
  });

  it("tech§6.1 another account's tag is not found and stays unchanged", async () => {
    await putTag(harness.deps(), MARIA, MOM);

    const saved = await putTag(harness.deps(), OMAR, MOM);

    expect(saved).toEqual({ ok: false, error: "not-found" });
    expect(await harness.globalVersion()).toBe(1);
  });

  it("tech§6.1 the same name may live in another family", async () => {
    await putTag(harness.deps(), MARIA, MOM);

    const saved = await putTag(harness.deps(), OMAR, { ...DAD, name: "Mom" });

    expect(saved.ok).toBe(true);
  });
});

describe("addFirstTag", () => {
  it("§7 a family with no tag gets one with the account's name and the first color", async () => {
    const added = await addFirstTag(harness.deps(), MARIA, "Maria");

    expect(added).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      name: "Maria",
      color: "lilac",
      createdAt: "2026-10-09T14:00:00.000Z",
      updatedAt: "2026-10-09T14:00:00.000Z",
      version: 1,
    });
  });

  it("§7 a family that already has a tag gets no new one", async () => {
    await putTag(harness.deps(), MARIA, MOM);

    expect(await addFirstTag(harness.deps(), MARIA, "Maria")).toBeUndefined();
    expect(await harness.globalVersion()).toBe(1);
  });

  it("tech§6.1 another family's tags don't count", async () => {
    await putTag(harness.deps(), OMAR, MOM);

    expect(await addFirstTag(harness.deps(), MARIA, "Maria")).toMatchObject({ name: "Maria" });
  });
});
