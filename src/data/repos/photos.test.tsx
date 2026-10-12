import { renderHook, waitFor } from "@testing-library/react";
import type { Photo } from "@/domain/schemas";
import { usePhotos } from "./photos";
import { type Harness, openHarness, synced, wrapperFor } from "./testHarness";

function photo(n: number, createdAt: string): Photo {
  return {
    id: `0195f0a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
    title: `Photo ${n}`,
    takenOn: "2026-09-27",
    createdAt,
  };
}

const NEWER = photo(1, "2026-10-04T10:00:00.000Z");

const OLDER = photo(2, "2026-09-01T10:00:00.000Z");

const DELETED = photo(3, "2026-09-15T10:00:00.000Z");

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-photos-repo-test");
});

afterEach(() => store.close());

describe("usePhotos", () => {
  it("TODAY-07 lists photos in upload order and updates when a row arrives", async () => {
    await store.db.photos.bulkPut([
      synced(NEWER),
      { ...synced(DELETED), deletedAt: "2026-10-01T00:00:00.000Z" },
    ]);

    const { result } = renderHook(() => usePhotos(), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current?.map((row) => row.id)).toEqual([NEWER.id]));

    await store.db.photos.put(synced(OLDER));

    await waitFor(() => expect(result.current?.map((row) => row.id)).toEqual([OLDER.id, NEWER.id]));
  });
});
