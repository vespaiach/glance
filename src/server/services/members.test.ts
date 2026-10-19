import type { Member } from "@/domain/schemas";
import { addFirstMember, deleteMember, putMember } from "./members";
import { MARIA, OMAR, serviceHarnessPerTest } from "./testServices";

const harness = serviceHarnessPerTest();

const MOM: Member = {
  id: "0192f3a0-3333-7000-8000-000000000001",
  name: "Mom",
  color: "coral",
  createdAt: "2026-10-01T15:00:00.000Z",
};

const DAD: Member = {
  id: "0192f3a0-3333-7000-8000-000000000002",
  name: "Dad",
  color: "mint",
  createdAt: "2026-10-01T15:01:00.000Z",
};

describe("putMember", () => {
  it("SYNC-01 saves a new member stamped with the server time and the next version", async () => {
    const saved = await putMember(harness.deps(), MARIA, MOM);

    expect(saved).toEqual({
      ok: true,
      value: { ...MOM, updatedAt: "2026-10-09T14:00:00.000Z", version: 1 },
    });
    expect(await harness.globalVersion()).toBe(1);
  });

  it("SYNC-03 renames a member with the last write to reach the server", async () => {
    await putMember(harness.deps(), MARIA, MOM);
    harness.advance(60_000);

    const saved = await putMember(harness.deps(), MARIA, { ...MOM, name: "MOM", color: "sun" });

    expect(saved).toEqual({
      ok: true,
      value: {
        ...MOM,
        name: "MOM",
        color: "sun",
        updatedAt: "2026-10-09T14:01:00.000Z",
        version: 2,
      },
    });
  });

  it("FAM-04 refuses a name another live member already has, ignoring case", async () => {
    await putMember(harness.deps(), MARIA, MOM);

    const saved = await putMember(harness.deps(), MARIA, { ...DAD, name: "mOM" });

    expect(saved).toEqual({ ok: false, error: "name-taken" });
    expect(await harness.globalVersion()).toBe(1);
  });

  it("FAM-04 a removed member's name can be used again", async () => {
    await putMember(harness.deps(), MARIA, MOM);
    await deleteMember(harness.deps(), MARIA, MOM.id);

    const saved = await putMember(harness.deps(), MARIA, { ...DAD, name: "Mom" });

    expect(saved.ok).toBe(true);
  });

  it("SYNC-03 delete wins: a put on a removed member answers the tombstone unchanged", async () => {
    await putMember(harness.deps(), MARIA, MOM);
    const tombstone = await deleteMember(harness.deps(), MARIA, MOM.id);

    const saved = await putMember(harness.deps(), MARIA, { ...MOM, name: "Back" });

    expect(saved).toEqual(tombstone);
  });

  it("tech§6.1 another account's member is not found and stays unchanged", async () => {
    await putMember(harness.deps(), MARIA, MOM);

    const saved = await putMember(harness.deps(), OMAR, { ...MOM, name: "Mine now" });

    expect(saved).toEqual({ ok: false, error: "not-found" });
    expect(await deleteMember(harness.deps(), OMAR, MOM.id)).toEqual({
      ok: false,
      error: "not-found",
    });
    expect(await harness.globalVersion()).toBe(1);
  });

  it("tech§6.1 the same name may live in another family", async () => {
    await putMember(harness.deps(), MARIA, MOM);

    const saved = await putMember(harness.deps(), OMAR, { ...DAD, name: "Mom" });

    expect(saved.ok).toBe(true);
  });
});

describe("deleteMember", () => {
  it("SYNC-01 keeps the member as a tombstone with a new version", async () => {
    await putMember(harness.deps(), MARIA, MOM);
    harness.advance(60_000);

    const deleted = await deleteMember(harness.deps(), MARIA, MOM.id);

    expect(deleted).toEqual({
      ok: true,
      value: {
        ...MOM,
        updatedAt: "2026-10-09T14:01:00.000Z",
        deletedAt: "2026-10-09T14:01:00.000Z",
        version: 2,
      },
    });
  });

  it("tech§6.1 an unknown member is not found", async () => {
    expect(await deleteMember(harness.deps(), MARIA, MOM.id)).toEqual({
      ok: false,
      error: "not-found",
    });
  });
});

describe("addFirstMember", () => {
  it("§7 a family with no member gets one with the account's name and the first color", async () => {
    const added = await addFirstMember(harness.deps(), MARIA, "Maria");

    expect(added).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      name: "Maria",
      color: "lilac",
      createdAt: "2026-10-09T14:00:00.000Z",
      updatedAt: "2026-10-09T14:00:00.000Z",
      version: 1,
    });
  });

  it("§7 a family that already has a member gets no new one", async () => {
    await putMember(harness.deps(), MARIA, MOM);

    expect(await addFirstMember(harness.deps(), MARIA, "Maria")).toBeUndefined();
    expect(await harness.globalVersion()).toBe(1);
  });

  it("tech§6.1 another family's members don't count", async () => {
    await putMember(harness.deps(), OMAR, MOM);

    expect(await addFirstMember(harness.deps(), MARIA, "Maria")).toMatchObject({ name: "Maria" });
  });
});
