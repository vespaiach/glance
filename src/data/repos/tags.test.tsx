import { renderHook, waitFor } from "@testing-library/react";
import type { Tag } from "@/domain/schemas";
import { createTagsRepo, useTags } from "./tags";
import { type Harness, openHarness, synced, wrapperFor } from "./testHarness";

const id = (group: number, n: number) =>
  `0195f0a0-0000-7000-800${group}-${String(n).padStart(12, "0")}`;

function tag(n: number, name: string, createdAt: string): Tag {
  return { id: id(1, n), name, color: "lilac", createdAt };
}

const AN = tag(1, "Minh-An", "2026-10-01T09:00:00.000Z");

const MOM = tag(2, "Mom", "2026-10-02T09:00:00.000Z");

const DAD = tag(3, "Dad", "2026-10-03T09:00:00.000Z");

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
