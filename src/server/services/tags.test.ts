import type { CalendarEvent, Tag } from "@/domain/schemas";
import { putEvent } from "./events";
import { addFirstTag, putTag, removeTag } from "./tags";
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

  it("FAM-04 a name another tag already has, ignoring case, answers that tag and bumps nothing", async () => {
    const stored = await putTag(harness.deps(), MARIA, MOM);

    const saved = await putTag(harness.deps(), MARIA, { ...DAD, name: "mOM" });

    expect(saved).toEqual(stored);
    expect(await harness.globalVersion()).toBe(1);
  });

  it("tech§6.1 another account's tag with the same name is never answered", async () => {
    await putTag(harness.deps(), OMAR, MOM);

    const saved = await putTag(harness.deps(), MARIA, { ...DAD, name: "Mom" });

    expect(saved).toMatchObject({ ok: true, value: { id: DAD.id, name: "Mom" } });
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

describe("removeTag", () => {
  const KID: Tag = { ...DAD, id: "0192f3a0-3333-7000-8000-000000000003", name: "Kid" };

  const plan = (n: number, tagIds: string[], everyone = false): CalendarEvent => ({
    id: `0192f3a0-1111-7000-8000-00000000000${n}`,
    title: `Plan ${n}`,
    startAt: "2026-10-01T16:00:00.000Z",
    everyone,
    tagIds,
    notify: true,
  });

  const ONLY_MOM = plan(1, [MOM.id]);

  const SHARED = plan(2, [MOM.id, DAD.id]);

  const EVERYONE = plan(3, [], true);

  const ONLY_DAD = plan(4, [DAD.id]);

  async function family(accountId = MARIA) {
    for (const tag of [MOM, DAD]) await putTag(harness.deps(), accountId, tag);

    for (const event of [ONLY_MOM, SHARED, EVERYONE, ONLY_DAD])
      await putEvent(harness.deps(), accountId, event);
  }

  async function storedEvent(id: string) {
    return (await harness.deps().db.events.find(id))?.value;
  }

  it("D24 soft-deletes the tag and its only-tag plans, and takes it off shared plans", async () => {
    await family();
    harness.advance(60_000);

    const removed = await removeTag(harness.deps(), MARIA, MOM.id);

    expect(removed).toEqual({
      ok: true,
      value: {
        ...MOM,
        updatedAt: "2026-10-09T14:01:00.000Z",
        deletedAt: "2026-10-09T14:01:00.000Z",
        version: 9,
      },
    });
    expect(await storedEvent(ONLY_MOM.id)).toMatchObject({ deletedAt: "2026-10-09T14:01:00.000Z" });
    expect(await storedEvent(SHARED.id)).toMatchObject({ tagIds: [DAD.id] });
    expect((await storedEvent(SHARED.id))?.deletedAt).toBeUndefined();
  });

  it("D24 bumps one version per changed row and leaves everyone and other plans alone", async () => {
    await family();

    await removeTag(harness.deps(), MARIA, MOM.id);

    expect(await harness.globalVersion()).toBe(9);
    expect(await storedEvent(EVERYONE.id)).toMatchObject({ version: 5 });
    expect(await storedEvent(ONLY_DAD.id)).toMatchObject({ version: 6 });
  });

  it("FAM-08 refuses removing the last live tag", async () => {
    await putTag(harness.deps(), MARIA, MOM);
    await putTag(harness.deps(), MARIA, DAD);
    await removeTag(harness.deps(), MARIA, DAD.id);

    expect(await removeTag(harness.deps(), MARIA, MOM.id)).toEqual({
      ok: false,
      error: "last-tag",
    });
    expect(await harness.globalVersion()).toBe(3);
  });

  it("SYNC-03 removing a removed tag again answers the stored tag and bumps nothing", async () => {
    await family();
    const first = await removeTag(harness.deps(), MARIA, MOM.id);

    expect(await removeTag(harness.deps(), MARIA, MOM.id)).toEqual(first);
    expect(await harness.globalVersion()).toBe(9);
  });

  it("tech§6.1 an unknown tag is not found", async () => {
    expect(await removeTag(harness.deps(), MARIA, KID.id)).toEqual({
      ok: false,
      error: "not-found",
    });
  });

  it("tech§6.1 another account's tag is not found and its tag and plans stay unchanged", async () => {
    await family(OMAR);

    expect(await removeTag(harness.deps(), MARIA, MOM.id)).toEqual({
      ok: false,
      error: "not-found",
    });
    expect((await harness.deps().db.tags.find(MOM.id))?.value.deletedAt).toBeUndefined();
    expect(await storedEvent(ONLY_MOM.id)).toMatchObject({ tagIds: [MOM.id], version: 3 });
    expect(await harness.globalVersion()).toBe(6);
  });
});
