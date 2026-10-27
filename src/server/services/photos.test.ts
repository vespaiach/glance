import { chmodSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import sharp, { type Exif } from "sharp";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { MAX_PHOTO_BYTES } from "@/domain/photoUpload";
import { err, ok } from "@/domain/result";
import { GB } from "@/domain/storage";
import { tempDirPerTest } from "../db/testDir";
import { bytesOf } from "../storage/contract";
import { createDiskStore } from "../storage/disk";
import type { PhotoStore } from "../storage/store";
import { spyOnLoggedErrors } from "../testLog";
import type { PlaceLocator } from "../weather/provider";
import {
  deletePhoto,
  type PhotoDeps,
  type PhotoUpload,
  photoFile,
  photoUsage,
  putPhoto,
  type SyncedPhoto,
  uploadPhoto,
} from "./photos";
import { putSettings } from "./settings";
import { pullChanges } from "./sync";
import { MARIA, OMAR, serviceHarnessPerTest } from "./testServices";

const harness = serviceHarnessPerTest();

const photosDir = tempDirPerTest();

const PORTLAND = {
  name: "Portland",
  region: "Oregon",
  lat: 45.52,
  lon: -122.68,
  timeZone: "America/Los_Angeles",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const CANNON_BEACH = { name: "Cannon Beach", region: "Oregon" };

const placeAt = vi.fn<PlaceLocator["placeAt"]>();

beforeEach(() => {
  placeAt.mockReset();
  placeAt.mockResolvedValue(ok(CANNON_BEACH));
});

function deps(storageLimit = 5 * GB): PhotoDeps {
  return {
    ...harness.deps(),
    store: createDiskStore(photosDir()),
    locator: { placeAt },
    storageLimit,
  };
}

const CANNON_BEACH_GPS: Exif = {
  IFD3: {
    GPSLatitudeRef: "N",
    GPSLatitude: "45/1 53/1 2400/100",
    GPSLongitudeRef: "W",
    GPSLongitude: "123/1 57/1 3600/100",
  },
};

type Picture = { width?: number; height?: number; exif?: Exif };

function jpeg({ width = 40, height = 20, exif = {} }: Picture = {}): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: "#c84" } })
    .jpeg()
    .withExif(exif)
    .toBuffer();
}

function upload(bytes: Buffer, overrides: Partial<PhotoUpload> = {}): PhotoUpload {
  return {
    name: "Beach day.jpg",
    type: "image/jpeg",
    size: bytes.length,
    body: Readable.from([bytes]),
    ...overrides,
  };
}

function storedFiles(): string[] {
  return readdirSync(photosDir(), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

function storedBytes(): number {
  return readdirSync(photosDir(), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .reduce((sum, entry) => sum + statSync(path.join(entry.parentPath, entry.name)).size, 0);
}

async function* zeroChunks(total: number): AsyncGenerator<Uint8Array> {
  const chunk = new Uint8Array(1024 * 1024);

  for (let sent = 0; sent < total; sent += chunk.length) {
    yield chunk.subarray(0, Math.min(chunk.length, total - sent));
  }
}

async function saved(bytes: Buffer, overrides: Partial<PhotoUpload> = {}) {
  const answer = await uploadPhoto(deps(), MARIA, upload(bytes, overrides));

  if (!answer.ok) throw new Error(answer.error);

  return answer.value;
}

describe("uploadPhoto", () => {
  it("PHOTO-10 saves the photo named from its file name, dated by its EXIF date, with no place and not checked", async () => {
    const bytes = await jpeg({ exif: { IFD2: { DateTimeOriginal: "2024:07:04 18:30:00" } } });

    const answer = await uploadPhoto(deps(), MARIA, upload(bytes));

    expect(answer).toEqual({
      ok: true,
      value: {
        id: expect.stringMatching(UUID),
        title: "Beach day",
        takenOn: "2024-07-04",
        createdAt: "2026-10-09T14:00:00.000Z",
        updatedAt: "2026-10-09T14:00:00.000Z",
        version: 1,
        sources: { title: "file-name", takenOn: "photo", place: "none" },
        checked: false,
        fileName: "Beach day.jpg",
      },
    });
    expect(placeAt).not.toHaveBeenCalled();
  });

  it("PHOTO-10 takes the name from the photo's description", async () => {
    const photo = await saved(
      await jpeg({ exif: { IFD0: { ImageDescription: "Mia at the lake" } } }),
    );

    expect(photo).toMatchObject({ title: "Mia at the lake", sources: { title: "photo" } });
  });

  it("PHOTO-10 takes the name from the photo's Windows title when it has no description", async () => {
    const photo = await saved(await jpeg({ exif: { IFD0: { XPTitle: "Lake day" } } }));

    expect(photo).toMatchObject({ title: "Lake day", sources: { title: "photo" } });
  });

  it("PHOTO-10 dates a photo by the date in its file name before the file's date", async () => {
    const photo = await saved(await jpeg(), {
      name: "halloween-costumes-2025-10-31.jpg",
      modifiedOn: "2026-08-01",
    });

    expect(photo).toMatchObject({
      title: "Halloween costumes",
      takenOn: "2025-10-31",
      sources: { title: "file-name", takenOn: "file-name", place: "none" },
    });
  });

  it("D22 dates a photo with no other date by the file's modified date", async () => {
    const photo = await saved(await jpeg(), { name: "IMG_4410.JPG", modifiedOn: "2026-08-01" });

    expect(photo).toMatchObject({
      title: "IMG_4410",
      takenOn: "2026-08-01",
      sources: { title: "file", takenOn: "file-date" },
    });
  });

  it("PHOTO-10 turns the photo's GPS into City, ST at 2 decimals and names it by the city", async () => {
    const photo = await saved(
      await jpeg({
        exif: { ...CANNON_BEACH_GPS, IFD2: { DateTimeOriginal: "2026:08:16 10:00:00" } },
      }),
      { name: "IMG_4410.JPG" },
    );

    expect(placeAt).toHaveBeenCalledWith({ lat: 45.89, lon: -123.96 });
    expect(photo).toMatchObject({
      title: "Cannon Beach",
      takenOn: "2026-08-16",
      place: "Cannon Beach, OR",
      sources: { title: "place", takenOn: "photo", place: "photo-location" },
      checked: false,
    });
  });

  it("D22 leaves the place empty for a place outside the US and still saves the photo", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    placeAt.mockResolvedValue(err("not-found"));

    const photo = await saved(await jpeg({ exif: CANNON_BEACH_GPS }), { name: "IMG_4410.JPG" });

    expect(photo).toMatchObject({ title: "IMG_4410", sources: { place: "none" } });
    expect(photo).not.toHaveProperty("place");
    expect(logged).not.toHaveBeenCalled();
    logged.mockRestore();
  });

  it("D22 leaves the place empty when the lookup fails and still saves the photo, logging nothing more", async () => {
    const logged = spyOnLoggedErrors();
    placeAt.mockResolvedValue(err("weather-failed"));

    const photo = await saved(await jpeg({ exif: CANNON_BEACH_GPS }));

    expect(photo.sources.place).toBe("none");
    expect(logged()).toEqual([]);
  });

  it("tech§6.6 logs a lookup that throws, leaves the place empty and still saves the photo", async () => {
    const logged = spyOnLoggedErrors();
    placeAt.mockRejectedValue(new Error("socket hang up"));

    const photo = await saved(await jpeg({ exif: CANNON_BEACH_GPS }));

    expect(photo.sources.place).toBe("none");
    expect(logged()).toMatchObject([
      { source: "weather", event: "fetch-failed", error: { message: "socket hang up" } },
    ]);
  });

  it("PHOTO-03 dates a photo with no EXIF date or file date by the upload day in the account's time zone", async () => {
    harness.advance(12 * 60 * 60 * 1000);

    const photo = await saved(await jpeg());

    expect(photo.takenOn).toBe("2026-10-09");
    expect(photo.sources.takenOn).toBe("file-date");
  });

  it("LOC-07 dates a photo with no EXIF date by the upload day in the location's time zone", async () => {
    await putSettings(harness.deps(), MARIA, MARIA, {
      ...DEFAULT_SETTINGS,
      weatherLocation: PORTLAND,
    });
    harness.advance(15 * 60 * 60 * 1000);

    const photo = await saved(await jpeg());

    expect(photo.takenOn).toBe("2026-10-09");
  });

  it("D12 makes WebP display (≤ 2560 px) and thumb (≤ 640 px) copies and doesn't keep the original", async () => {
    const bytes = await jpeg({ width: 3000, height: 1500 });

    const photo = await saved(bytes);

    const display = await photoFile(deps(), MARIA, photo.id, "display");
    const thumb = await photoFile(deps(), MARIA, photo.id, "thumb");
    if (!display.ok || !thumb.ok) throw new Error("missing file");
    expect(await deps().store.get(`${MARIA}/${photo.id}.orig`)).toEqual(err("not-found"));
    expect(await sharp(await bytesOf(display.value)).metadata()).toMatchObject({
      format: "webp",
      width: 2560,
      height: 1280,
    });
    expect(await sharp(await bytesOf(thumb.value)).metadata()).toMatchObject({
      format: "webp",
      width: 640,
      height: 320,
    });
  });

  it("D12 turns the copies upright by their EXIF orientation", async () => {
    const sideways = await sharp(await jpeg())
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const photo = await saved(sideways);

    const display = await photoFile(deps(), MARIA, photo.id, "display");

    if (!display.ok) throw new Error(display.error);
    expect(await sharp(await bytesOf(display.value)).metadata()).toMatchObject({
      width: 20,
      height: 40,
    });
  });

  it("PHOTO-04 refuses a file that grows past 20 MB while streaming and keeps nothing", async () => {
    const answer = await uploadPhoto(
      deps(),
      MARIA,
      upload(Buffer.alloc(0), { size: undefined, body: zeroChunks(MAX_PHOTO_BYTES + 1) }),
    );

    expect(answer).toEqual({ ok: false, error: "too-large" });
    expect(storedFiles()).toEqual([]);
    expect(await harness.globalVersion()).toBe(0);
  });

  it("PHOTO-04 refuses a declared size over 20 MB without reading the body", async () => {
    const body = {
      [Symbol.asyncIterator]: () => {
        throw new Error("read the body");
      },
    };

    const answer = await uploadPhoto(
      deps(),
      MARIA,
      upload(Buffer.alloc(0), { size: MAX_PHOTO_BYTES + 1, body }),
    );

    expect(answer).toEqual({ ok: false, error: "too-large" });
  });

  it("PHOTO-04 refuses a file whose type isn't an image", async () => {
    const answer = await uploadPhoto(
      deps(),
      MARIA,
      upload(Buffer.from("hello"), { name: "notes.txt", type: "text/plain" }),
    );

    expect(answer).toEqual({ ok: false, error: "not-a-photo" });
  });

  it("PHOTO-04 refuses image bytes it can't decode, keeps nothing and logs it", async () => {
    const logged = spyOnLoggedErrors();

    const answer = await uploadPhoto(deps(), MARIA, upload(Buffer.from("not really a jpeg")));

    expect(answer).toEqual({ ok: false, error: "not-a-photo" });
    expect(logged()).toMatchObject([
      { source: "photos", event: "decode-failed", accountId: MARIA, error: { name: "Error" } },
    ]);
    expect(storedFiles()).toEqual([]);
    expect(await harness.globalVersion()).toBe(0);
  });

  it("PHOTO-04 refuses an SVG, which isn't a photo", async () => {
    const svg = Buffer.from(
      "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><script>alert(1)</script></svg>",
    );

    const answer = await uploadPhoto(
      deps(),
      MARIA,
      upload(svg, { name: "logo.svg", type: "image/svg+xml" }),
    );

    expect(answer).toEqual({ ok: false, error: "not-a-photo" });
  });

  it("tech§6.3 a failed put removes the objects already stored and keeps no row", async () => {
    const disk = createDiskStore(photosDir());
    const store: PhotoStore = {
      ...disk,
      put: (key, body, contentType) =>
        key.endsWith(".thumb")
          ? Promise.reject(new Error("bucket unavailable"))
          : disk.put(key, body, contentType),
    };

    await expect(uploadPhoto({ ...deps(), store }, MARIA, upload(await jpeg()))).rejects.toThrow(
      "bucket unavailable",
    );

    expect(storedFiles()).toEqual([]);
    expect(await harness.globalVersion()).toBe(0);
  });

  it("D12 stores exactly the two copies under {account}/{id} with their content types", async () => {
    const put = vi.fn<PhotoStore["put"]>().mockResolvedValue();

    const photo = await uploadPhoto(
      { ...deps(), store: { ...deps().store, put } },
      MARIA,
      upload(await jpeg()),
    );

    if (!photo.ok) throw new Error(photo.error);
    expect(put.mock.calls.map(([key, , type]) => [key, type]).sort()).toEqual([
      [`${MARIA}/${photo.value.id}.display`, "image/webp"],
      [`${MARIA}/${photo.value.id}.thumb`, "image/webp"],
    ]);
  });

  it("SYNC-02 the saved photo reaches other displays through the pull", async () => {
    const photo = await saved(await jpeg());

    expect((await pullChanges(harness.deps(), MARIA, 0)).changes).toEqual([
      { entity: "photos", row: photo },
    ]);
  });
});

describe("photoFile", () => {
  it("tech§6.3 serves the copies as WebP", async () => {
    const photo = await saved(await jpeg());

    const display = await photoFile(deps(), MARIA, photo.id, "display");
    const thumb = await photoFile(deps(), MARIA, photo.id, "thumb");

    expect([display, thumb]).toEqual([
      { ok: true, value: expect.objectContaining({ contentType: "image/webp" }) },
      { ok: true, value: expect.objectContaining({ contentType: "image/webp" }) },
    ]);
    expect(storedFiles().sort()).toEqual([`${photo.id}.display`, `${photo.id}.thumb`]);
  });

  it("tech§5 answers not-found for another account's photo", async () => {
    const photo = await saved(await jpeg());

    expect(await photoFile(deps(), OMAR, photo.id, "display")).toEqual({
      ok: false,
      error: "not-found",
    });
  });

  it("tech§6.3 answers not-found for a photo the server never had", async () => {
    expect(await photoFile(deps(), MARIA, "0192f3a0-3333-7000-8000-000000000001", "thumb")).toEqual(
      { ok: false, error: "not-found" },
    );
  });
});

const HOUR_MS = 60 * 60 * 1000;

function edited(photo: SyncedPhoto) {
  const { updatedAt: _updatedAt, version: _version, ...fields } = photo;

  return {
    ...fields,
    title: "Mia at Cannon Beach",
    takenOn: "2026-08-15",
    place: "Seaside, OR",
    sources: { title: "edited", takenOn: "edited", place: "edited" },
    checked: true,
  } as const;
}

describe("putPhoto", () => {
  it("PHOTO-12 saves the edited name, date, place, sources and checked with the next version", async () => {
    const photo = await saved(await jpeg());
    harness.advance(HOUR_MS);

    const answer = await putPhoto(deps(), MARIA, edited(photo));

    expect(answer).toEqual({
      ok: true,
      value: { ...edited(photo), updatedAt: "2026-10-09T15:00:00.000Z", version: 2 },
    });
    expect((await pullChanges(harness.deps(), MARIA, 1)).changes).toEqual([
      { entity: "photos", row: answer.ok && answer.value },
    ]);
  });

  it("PHOTO-12 keeps the upload time and the file name the client can't change", async () => {
    const photo = await saved(await jpeg());

    const answer = await putPhoto(deps(), MARIA, {
      ...edited(photo),
      createdAt: "2020-01-01T00:00:00.000Z",
      fileName: "other.jpg",
    });

    expect(answer).toMatchObject({
      ok: true,
      value: { createdAt: photo.createdAt, fileName: "Beach day.jpg" },
    });
  });

  it("PHOTO-11 saves a photo with no date or place and answers it without them", async () => {
    const photo = await saved(await jpeg());

    const { takenOn: _takenOn, place: _place, ...undated } = edited(photo);

    const answer = await putPhoto(deps(), MARIA, undated);

    expect(answer.ok && answer.value).not.toHaveProperty("takenOn");
    expect(answer.ok && answer.value).not.toHaveProperty("place");
    expect((await pullChanges(harness.deps(), MARIA, 1)).changes[0]?.row).not.toHaveProperty(
      "takenOn",
    );
  });

  it("SYNC-03 delete wins: a put on a deleted photo answers the tombstone unchanged", async () => {
    const photo = await saved(await jpeg());
    const tombstone = await deletePhoto(deps(), MARIA, photo.id);

    const answer = await putPhoto(deps(), MARIA, edited(photo));

    expect(answer).toEqual(tombstone);
    expect(await harness.globalVersion()).toBe(2);
  });

  it("tech§5 answers not-found for a photo the server never had and stores nothing", async () => {
    const photo = await saved(await jpeg());

    const answer = await putPhoto(deps(), MARIA, {
      ...edited(photo),
      id: "0192f3a0-3333-7000-8000-000000000001",
    });

    expect(answer).toEqual({ ok: false, error: "not-found" });
    expect(await harness.globalVersion()).toBe(1);
  });

  it("tech§5 refuses to edit another account's photo", async () => {
    const photo = await saved(await jpeg());

    expect(await putPhoto(deps(), OMAR, edited(photo))).toEqual({
      ok: false,
      error: "not-found",
    });
    expect((await pullChanges(harness.deps(), MARIA, undefined)).changes[0]?.row).toEqual(photo);
  });
});

describe("deletePhoto", () => {
  it("PHOTO-13 keeps a tombstone stamped with the delete time and removes the photo's files", async () => {
    const photo = await saved(await jpeg());
    harness.advance(HOUR_MS);

    const answer = await deletePhoto(deps(), MARIA, photo.id);

    expect(answer).toEqual({
      ok: true,
      value: {
        ...photo,
        updatedAt: "2026-10-09T15:00:00.000Z",
        deletedAt: "2026-10-09T15:00:00.000Z",
        version: 2,
      },
    });
    expect(storedFiles()).toEqual([]);
  });

  it("D12 removes the display, thumb and any original left from before", async () => {
    const photo = await saved(await jpeg());
    const remove = vi.fn<PhotoStore["remove"]>().mockResolvedValue();

    await deletePhoto({ ...deps(), store: { ...deps().store, remove } }, MARIA, photo.id);

    expect(remove.mock.calls[0]?.[0].sort()).toEqual([
      `${MARIA}/${photo.id}.display`,
      `${MARIA}/${photo.id}.orig`,
      `${MARIA}/${photo.id}.thumb`,
    ]);
  });

  it("SYNC-02 other displays pull the tombstone", async () => {
    const photo = await saved(await jpeg());

    const answer = await deletePhoto(deps(), MARIA, photo.id);

    expect((await pullChanges(harness.deps(), MARIA, 1)).changes).toEqual([
      { entity: "photos", row: answer.ok && answer.value },
    ]);
  });

  it("SYNC-02 answers the same tombstone when the delete is replayed", async () => {
    const photo = await saved(await jpeg());
    const first = await deletePhoto(deps(), MARIA, photo.id);
    harness.advance(HOUR_MS);

    expect(await deletePhoto(deps(), MARIA, photo.id)).toEqual(first);
    expect(await harness.globalVersion()).toBe(2);
  });

  it("PHOTO-13 still deletes the photo when its files can't be removed, and logs it", async () => {
    const logged = spyOnLoggedErrors();
    const photo = await saved(await jpeg());

    const accountDir = path.join(photosDir(), MARIA);
    chmodSync(accountDir, 0o500);

    const answer = await deletePhoto(deps(), MARIA, photo.id);

    chmodSync(accountDir, 0o700);
    expect(answer).toMatchObject({ ok: true, value: { deletedAt: expect.any(String) } });
    expect(logged()).toMatchObject([
      { source: "storage", event: "remove-failed", accountId: MARIA, photoId: photo.id },
    ]);
    expect(storedFiles()).toHaveLength(2);
  });

  it("tech§5 answers not-found for a photo the server never had", async () => {
    expect(await deletePhoto(deps(), MARIA, "0192f3a0-3333-7000-8000-000000000001")).toEqual({
      ok: false,
      error: "not-found",
    });
  });

  it("tech§5 refuses to delete another account's photo and keeps its files", async () => {
    const photo = await saved(await jpeg());

    expect(await deletePhoto(deps(), OMAR, photo.id)).toEqual({ ok: false, error: "not-found" });
    expect(storedFiles()).toHaveLength(2);
    expect((await pullChanges(harness.deps(), MARIA, undefined)).changes[0]?.row).toEqual(photo);
  });

  it("PHOTO-13 a deleted photo's file is not found", async () => {
    const photo = await saved(await jpeg());
    await deletePhoto(deps(), MARIA, photo.id);

    expect(await photoFile(deps(), MARIA, photo.id, "display")).toEqual({
      ok: false,
      error: "not-found",
    });
  });
});

describe("photo storage", () => {
  it("D32 photoUsage sums the stored copies of the account's live photos, with the limit", async () => {
    await saved(await jpeg());
    await saved(await jpeg({ width: 400, height: 300 }));

    expect(await photoUsage(deps(), MARIA)).toEqual({ used: storedBytes(), limit: 5 * GB });
  });

  it("D32 a deleted photo no longer counts", async () => {
    const photo = await saved(await jpeg());

    await deletePhoto(deps(), MARIA, photo.id);

    expect(await photoUsage(deps(), MARIA)).toEqual({ used: 0, limit: 5 * GB });
  });

  it("tech§5 photoUsage doesn't count another account's photos", async () => {
    await saved(await jpeg());

    expect(await photoUsage(deps(), OMAR)).toEqual({ used: 0, limit: 5 * GB });
  });

  it("SET-13 refuses an upload that would pass the configured limit with storage-full and stores nothing", async () => {
    await saved(await jpeg());
    const limit = storedBytes() + 10;

    const answer = await uploadPhoto(deps(limit), MARIA, upload(await jpeg()));

    expect(answer).toEqual({ ok: false, error: "storage-full" });
    expect(storedFiles()).toHaveLength(2);
    expect(await harness.globalVersion()).toBe(1);
  });

  it("SET-13 takes an upload that fills the limit exactly", async () => {
    await saved(await jpeg());
    const limit = 2 * storedBytes();

    const answer = await uploadPhoto(deps(limit), MARIA, upload(await jpeg()));

    expect(answer.ok).toBe(true);
    expect(await photoUsage(deps(limit), MARIA)).toEqual({ used: limit, limit });
  });

  it("tech§5 another account's photos don't count toward the limit", async () => {
    await saved(await jpeg());
    const limit = storedBytes();

    const answer = await uploadPhoto(deps(limit), OMAR, upload(await jpeg()));

    expect(answer.ok).toBe(true);
  });
});
