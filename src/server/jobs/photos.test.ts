import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import sharp from "sharp";
import { GB } from "@/domain/storage";
import { tempDirPerTest } from "../db/testDir";
import { uploadPhoto } from "../services/photos";
import { MARIA, OMAR, serviceHarnessPerTest } from "../services/testServices";
import { createDiskStore } from "../storage/disk";
import type { PhotoStore } from "../storage/store";
import { backfillPhotoBytes, removeDeletedPhotoFiles, removePhotoOriginals } from "./photos";

const harness = serviceHarnessPerTest();

const photosDir = tempDirPerTest();

function deps() {
  return { ...harness.deps(), store: createDiskStore(photosDir()) };
}

async function stored(accountId: string): Promise<string> {
  const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#c84" } })
    .jpeg()
    .toBuffer();

  const photoDeps = { ...deps(), locator: { placeAt: vi.fn() }, storageLimit: GB };

  const answer = await uploadPhoto(photoDeps, accountId, {
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

async function withOriginal(accountId: string, id: string): Promise<void> {
  await deps().store.put(`${accountId}/${id}.orig`, new Uint8Array([1, 2, 3]), "image/jpeg");
}

async function unsized(accountId: string, id: string): Promise<void> {
  await harness.deps().db.photos.sized(`${accountId}/${id}`, 0);
}

function storedBytes(accountId: string): number {
  return readdirSync(path.join(photosDir(), accountId), { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .reduce((sum, entry) => sum + statSync(path.join(entry.parentPath, entry.name)).size, 0);
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

    expect(storedFiles()).toEqual([`${kept}.display`, `${kept}.thumb`]);
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

    expect(storedFiles()).toEqual([`${stuck}.display`, `${stuck}.thumb`]);
  });
});

describe("removePhotoOriginals", () => {
  it("D12 removes every live photo's original in every account and keeps its copies", async () => {
    const mine = await stored(MARIA);
    const theirs = await stored(OMAR);
    await withOriginal(MARIA, mine);
    await withOriginal(OMAR, theirs);

    await removePhotoOriginals(deps());

    expect(storedFiles()).toEqual(
      [`${mine}.display`, `${mine}.thumb`, `${theirs}.display`, `${theirs}.thumb`].sort(),
    );
  });

  it("D12 is safe to run twice", async () => {
    const mine = await stored(MARIA);
    await withOriginal(MARIA, mine);

    await removePhotoOriginals(deps());
    await removePhotoOriginals(deps());

    expect(storedFiles()).toEqual([`${mine}.display`, `${mine}.thumb`]);
  });
});

describe("backfillPhotoBytes", () => {
  it("D32 sizes every live photo stored without a size from its copies, in every account", async () => {
    const mine = await stored(MARIA);
    const theirs = await stored(OMAR);
    await unsized(MARIA, mine);
    await unsized(OMAR, theirs);

    await backfillPhotoBytes(deps());

    expect(await harness.deps().db.photos.usage(MARIA)).toBe(storedBytes(MARIA));
    expect(await harness.deps().db.photos.usage(OMAR)).toBe(storedBytes(OMAR));
    expect(await harness.deps().db.photos.unsizedPaths()).toEqual([]);
  });

  it("D32 is safe to run twice", async () => {
    const mine = await stored(MARIA);
    await unsized(MARIA, mine);

    await backfillPhotoBytes(deps());
    await backfillPhotoBytes(deps());

    expect(await harness.deps().db.photos.usage(MARIA)).toBe(storedBytes(MARIA));
  });
});
