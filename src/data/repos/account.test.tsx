import { renderHook, waitFor } from "@testing-library/react";
import { useAccountCounts } from "./account";
import { type Harness, openHarness, synced, wrapperFor } from "./testHarness";

const DELETED = "2026-10-05T09:00:00.000Z";

const id = (n: number) => `0195f0a0-0000-7000-8000-${String(n).padStart(12, "0")}`;

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-account-repo-test");
});

afterEach(() => store.close());

describe("useAccountCounts", () => {
  it("SET-14 counts the account's live events, notes, photos and family members", async () => {
    await store.db.events.bulkPut([
      synced({
        id: id(1),
        title: "Swim",
        startAt: "2026-10-10T16:00:00.000Z",
        everyone: true,
        tagIds: [],
      }),
      synced({
        id: id(2),
        title: "Dentist",
        startAt: "2026-10-11T16:00:00.000Z",
        everyone: true,
        tagIds: [],
      }),
      {
        ...synced({
          id: id(3),
          title: "Gone",
          startAt: "2026-10-12T16:00:00.000Z",
          everyone: true,
          tagIds: [],
        }),
        deletedAt: DELETED,
      },
    ] as never);
    await store.db.notes.bulkPut([
      synced({ id: id(4), text: "Milk", author: "Maria", createdAt: DELETED, rotation: 0 }),
    ] as never);
    await store.db.tags.bulkPut([
      synced({ id: id(5), name: "Mom", color: "lilac", createdAt: DELETED }),
      {
        ...synced({ id: id(6), name: "Dad", color: "sky", createdAt: DELETED }),
        deletedAt: DELETED,
      },
    ] as never);

    const { result } = renderHook(() => useAccountCounts(), { wrapper: wrapperFor(store) });

    await waitFor(() =>
      expect(result.current).toEqual({ events: 2, notes: 1, photos: 0, tags: 1 }),
    );
  });
});
