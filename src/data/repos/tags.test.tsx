import { renderHook, waitFor } from "@testing-library/react";
import type { CalendarEvent, Tag } from "@/domain/schemas";
import { createTagsRepo, useTags } from "./tags";
import { type Harness, openHarness, synced, TEST_NOW, wrapperFor } from "./testHarness";

const id = (group: number, n: number) =>
  `0195f0a0-0000-7000-800${group}-${String(n).padStart(12, "0")}`;

function tag(n: number, name: string, createdAt: string): Tag {
  return { id: id(1, n), name, color: "lilac", createdAt };
}

const AN = tag(1, "Minh-An", "2026-10-01T09:00:00.000Z");

const MOM = tag(2, "Mom", "2026-10-02T09:00:00.000Z");

const DAD = tag(3, "Dad", "2026-10-03T09:00:00.000Z");

function plan(n: number, tagIds: string[], everyone = false): CalendarEvent {
  return {
    id: id(2, n),
    title: `Plan ${n}`,
    startAt: "2026-10-01T16:00:00.000Z",
    everyone,
    tagIds,
    notify: true,
  };
}

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-tags-repo-test");
});

afterEach(() => store.close());

describe("tags repo", () => {
  it("tech§4.2 add writes the row and a put outbox entry, then nudges", async () => {
    await createTagsRepo(store).add(MOM);

    expect(await store.db.tags.get(MOM.id)).toMatchObject({ ...MOM, version: 0 });
    expect(await store.db.outbox.toArray()).toMatchObject([
      { entity: "tags", entityId: MOM.id, op: "put", payload: { ...MOM, version: 0 } },
    ]);
    expect(store.nudge).toHaveBeenCalledTimes(1);
  });

  it("D24 remove deletes the tag and its only-tag plans, takes it off shared ones, and queues one delete", async () => {
    const only = plan(1, [MOM.id]);
    const shared = plan(2, [AN.id, MOM.id]);
    const everyone = plan(3, [], true);
    await store.db.tags.bulkPut([synced(AN), synced(MOM)]);
    await store.db.events.bulkPut([synced(only), synced(shared), synced(everyone)]);

    await createTagsRepo(store).remove(MOM.id);

    const deletedAt = TEST_NOW.toISOString();
    expect(await store.db.tags.get(MOM.id)).toEqual({ ...synced(MOM), deletedAt });
    expect(await store.db.events.get(only.id)).toEqual({ ...synced(only), deletedAt });
    expect(await store.db.events.get(shared.id)).toEqual({ ...synced(shared), tagIds: [AN.id] });
    expect(await store.db.events.get(everyone.id)).toEqual(synced(everyone));
    expect(await store.db.outbox.toArray()).toEqual([
      { seq: 1, entity: "tags", entityId: MOM.id, op: "delete", attempts: 0 },
    ]);
    expect(store.nudge).toHaveBeenCalledTimes(1);
  });

  it("tech§4.2 removing an unknown tag changes and queues nothing", async () => {
    const only = plan(1, [MOM.id]);
    await store.db.events.put(synced(only));

    await createTagsRepo(store).remove(MOM.id);

    expect(await store.db.events.get(only.id)).toEqual(synced(only));
    expect(await store.db.outbox.count()).toBe(0);
    expect(store.nudge).not.toHaveBeenCalled();
  });
});

describe("useTags", () => {
  it("FAM-05 lists tags oldest first", async () => {
    await store.db.tags.bulkPut([
      synced(DAD),
      synced(AN),
      { ...synced(MOM), deletedAt: "2026-10-05T09:00:00.000Z" },
    ]);

    const { result } = renderHook(() => useTags(), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current?.map((row) => row.name)).toEqual(["Minh-An", "Dad"]));
  });
});
