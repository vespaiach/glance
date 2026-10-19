import { renderHook, waitFor } from "@testing-library/react";
import type { CalendarEvent, Member } from "@/domain/schemas";
import { createMembersRepo, useMemberPlans, useMembers } from "./members";
import { type Harness, openHarness, synced, TEST_NOW, wrapperFor } from "./testHarness";

const id = (group: number, n: number) =>
  `0195f0a0-0000-7000-800${group}-${String(n).padStart(12, "0")}`;

function member(n: number, name: string, createdAt: string): Member {
  return { id: id(1, n), name, color: "lilac", createdAt };
}

const AN = member(1, "Minh-An", "2026-10-01T09:00:00.000Z");

const MOM = member(2, "Mom", "2026-10-02T09:00:00.000Z");

const DAD = member(3, "Dad", "2026-10-03T09:00:00.000Z");

function event(n: number, who: Member[] | "everyone"): CalendarEvent {
  return {
    id: id(2, n),
    title: `Plan ${n}`,
    startAt: "2026-10-09T16:00:00.000Z",
    everyone: who === "everyone",
    memberIds: who === "everyone" ? [] : who.map((one) => one.id),
  };
}

const SOLO = event(1, [MOM]);

const SHARED = event(2, [AN, MOM]);

const ALL = event(3, "everyone");

const OTHER = event(4, [DAD]);

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-members-repo-test");
});

afterEach(() => store.close());

describe("members repo", () => {
  it("tech§4.2 put writes the row and a put outbox entry, then nudges", async () => {
    await createMembersRepo(store).put(MOM);

    expect(await store.db.members.get(MOM.id)).toMatchObject({ ...MOM, version: 0 });
    expect(await store.db.outbox.toArray()).toMatchObject([
      { entity: "members", entityId: MOM.id, op: "put", payload: { ...MOM, version: 0 } },
    ]);
    expect(store.nudge).toHaveBeenCalledTimes(1);
  });

  it("FAM-03 remove deletes the member's solo plans, strips shared ones and leaves the rest", async () => {
    await store.db.members.bulkPut([synced(AN), synced(MOM), synced(DAD)]);
    await store.db.events.bulkPut([synced(SOLO), synced(SHARED), synced(ALL), synced(OTHER)]);

    await createMembersRepo(store).remove(MOM.id);

    const deletedAt = TEST_NOW.toISOString();
    expect(await store.db.members.get(MOM.id)).toEqual({ ...synced(MOM), deletedAt });
    expect(await store.db.events.toArray()).toEqual([
      { ...synced(SOLO), deletedAt },
      synced({ ...SHARED, memberIds: [AN.id] }),
      synced(ALL),
      synced(OTHER),
    ]);
    expect(await store.db.outbox.toArray()).toMatchObject([
      { entity: "members", entityId: MOM.id, op: "delete" },
      { entity: "events", entityId: SOLO.id, op: "delete" },
      {
        entity: "events",
        entityId: SHARED.id,
        op: "put",
        payload: synced({ ...SHARED, memberIds: [AN.id] }),
      },
    ]);
    expect(store.nudge).toHaveBeenCalledTimes(1);
  });

  it("FAM-06 remove works offline as one transaction: everything waits in the outbox", async () => {
    await store.db.members.bulkPut([synced(AN), synced(MOM)]);
    await store.db.events.bulkPut([synced(SOLO), synced(SHARED)]);
    await store.db.outbox.add({
      entity: "events",
      entityId: SOLO.id,
      op: "put",
      payload: synced(SOLO),
      attempts: 2,
    });

    await createMembersRepo(store).remove(MOM.id);

    expect((await store.db.outbox.toArray()).map((entry) => [entry.entityId, entry.op])).toEqual([
      [SOLO.id, "put"],
      [MOM.id, "delete"],
      [SOLO.id, "delete"],
      [SHARED.id, "put"],
    ]);
  });

  it("tech§4.2 removing a member that is already gone does nothing", async () => {
    await createMembersRepo(store).remove(MOM.id);

    expect(await store.db.outbox.count()).toBe(0);
    expect(store.nudge).not.toHaveBeenCalled();
  });
});

describe("useMembers", () => {
  it("FAM-05 lists members oldest first, without removed ones", async () => {
    await store.db.members.bulkPut([
      synced(DAD),
      synced(AN),
      { ...synced(MOM), deletedAt: "2026-10-05T09:00:00.000Z" },
    ]);

    const { result } = renderHook(() => useMembers(), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current?.map((row) => row.name)).toEqual(["Minh-An", "Dad"]));
  });
});

describe("useMemberPlans", () => {
  it("FAM-02 lists live plans that name members, without everyone plans", async () => {
    await store.db.events.bulkPut([
      synced(SOLO),
      synced(SHARED),
      synced(ALL),
      { ...synced(OTHER), deletedAt: "2026-10-05T09:00:00.000Z" },
    ]);

    const { result } = renderHook(() => useMemberPlans(), { wrapper: wrapperFor(store) });

    await waitFor(() =>
      expect(result.current?.map((row) => row.id).sort()).toEqual([SOLO.id, SHARED.id].sort()),
    );
  });
});
