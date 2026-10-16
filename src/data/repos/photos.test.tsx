import { renderHook, waitFor } from "@testing-library/react";
import { err, ok } from "@/domain/result";
import type { Photo } from "@/domain/schemas";
import { createPhotosRepo, usePhotos } from "./photos";
import { type Harness, openHarness, synced, wrapperFor } from "./testHarness";

function photo(n: number, createdAt: string): Photo {
  return {
    id: `0195f0a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
    title: `Photo ${n}`,
    takenOn: "2026-09-27",
    sources: { title: "photo", takenOn: "photo", place: "photo-location" },
    checked: true,
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

describe("PhotosRepo.upload", () => {
  const chosen = new File(["x"], "IMG_2041.jpg", { type: "image/jpeg" });

  it("D22 sends the file and its modified date, reports its progress and stores the returned row", async () => {
    const row = synced(NEWER, 4);

    store.upload.mockImplementation(async (_file, _modifiedOn, onProgress) => {
      onProgress(50);

      return ok(row);
    });

    const progress: number[] = [];

    const answer = await createPhotosRepo(store).upload(chosen, "2026-10-08", (percent) =>
      progress.push(percent),
    );

    expect(answer).toEqual(ok(row));
    expect(store.upload).toHaveBeenCalledWith(chosen, "2026-10-08", expect.any(Function));
    expect(progress).toEqual([50]);
    expect(await store.db.photos.get(NEWER.id)).toEqual(row);
  });

  it("PHOTO-08 a failed upload stores nothing and answers the error", async () => {
    store.upload.mockResolvedValue(err("network"));

    expect(await createPhotosRepo(store).upload(chosen, "2026-10-08", () => {})).toEqual(
      err("network"),
    );
    expect(await store.db.photos.count()).toBe(0);
  });
});

describe("PhotosRepo.update and remove", () => {
  it("PHOTO-12 update writes the edited row with its server fields and a put outbox entry, then nudges", async () => {
    await store.db.photos.put(synced(NEWER, 7));

    await createPhotosRepo(store).update({ ...NEWER, title: "Lake day", checked: true });

    const row = { ...synced(NEWER, 7), title: "Lake day", checked: true };

    expect(await store.db.photos.get(NEWER.id)).toEqual(row);
    expect(await store.db.outbox.toArray()).toEqual([
      { seq: 1, entity: "photos", entityId: NEWER.id, op: "put", payload: row, attempts: 0 },
    ]);
    expect(store.nudge).toHaveBeenCalledTimes(1);
  });

  it("PHOTO-13 remove takes the photo off the list and queues a delete", async () => {
    await store.db.photos.bulkPut([synced(NEWER), synced(OLDER)]);

    const { result } = renderHook(() => usePhotos(), { wrapper: wrapperFor(store) });

    await createPhotosRepo(store).remove(NEWER.id);

    await waitFor(() => expect(result.current?.map((row) => row.id)).toEqual([OLDER.id]));
    expect(await store.db.outbox.toArray()).toEqual([
      { seq: 1, entity: "photos", entityId: NEWER.id, op: "delete", attempts: 0 },
    ]);
  });
});
