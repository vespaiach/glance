import { readdirSync } from "node:fs";
import { Readable } from "node:stream";
import sharp from "sharp";
import { tempDirPerTest } from "../db/testDir";
import { uploadPhoto } from "../services/photos";
import { MARIA, OMAR, serviceHarnessPerTest } from "../services/testServices";
import { createDiskStore } from "../storage/disk";
import type { PhotoStore } from "../storage/store";
import { removeDeletedPhotoFiles } from "./photos";

const harness = serviceHarnessPerTest();

const photosDir = tempDirPerTest();

function deps() {
  return { ...harness.deps(), store: createDiskStore(photosDir()) };
}

async function stored(accountId: string): Promise<string> {
  const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#c84" } })
    .jpeg()
    .toBuffer();

  const answer = await uploadPhoto({ ...deps(), locator: { placeAt: vi.fn() } }, accountId, {
    name: "Beach.jpg",
    type: "image/jpeg",
    size: bytes.length,
    body: Readable.from([bytes]),
  });

  if (!answer.ok) throw new Error(answer.error);

  return answer.value.id;
}

async function markDeleted(accountId: string, id: string): Promise<void> {
  const photo = await harness.deps().db.photos.find(accountId, id);

  if (photo)
    await harness.deps().db.photos.save(accountId, { ...photo, deletedAt: photo.updatedAt });
}

function storedFiles(): string[] {
  return readdirSync(photosDir(), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

describe("removeDeletedPhotoFiles", () => {
  it("PHOTO-13 removes the files a deleted photo left behind, in every account, and keeps live photos' files", async () => {
    const gone = await stored(MARIA);
    const otherGone = await stored(OMAR);
    const kept = await stored(MARIA);
    await markDeleted(MARIA, gone);
    await markDeleted(OMAR, otherGone);

    await removeDeletedPhotoFiles(deps());

    expect(storedFiles()).toEqual([`${kept}.display`, `${kept}.orig`, `${kept}.thumb`]);
  });

  it("PHOTO-13 removes a deleted photo's files once, not on every run", async () => {
    const gone = await stored(MARIA);
    await markDeleted(MARIA, gone);
    const disk = createDiskStore(photosDir());
    const remove = vi.fn(disk.remove);

    await removeDeletedPhotoFiles({ ...harness.deps(), store: { ...disk, remove } });
    await removeDeletedPhotoFiles({ ...harness.deps(), store: { ...disk, remove } });

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("PHOTO-13 removes the other deleted photos' files when one photo's removal fails, then throws", async () => {
    const stuck = await stored(MARIA);
    const gone = await stored(MARIA);
    await markDeleted(MARIA, stuck);
    await markDeleted(MARIA, gone);
    const disk = createDiskStore(photosDir());
    const store: PhotoStore = {
      ...disk,
      remove: async (keys) => {
        if (keys.some((key) => key.includes(stuck))) throw new Error("EBUSY");

        await disk.remove(keys);
      },
    };

    await expect(removeDeletedPhotoFiles({ ...harness.deps(), store })).rejects.toThrow("EBUSY");

    expect(storedFiles()).toEqual([`${stuck}.display`, `${stuck}.orig`, `${stuck}.thumb`]);
  });
});
