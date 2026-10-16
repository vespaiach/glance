import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import sharp, { type Exif } from "sharp";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { MAX_PHOTO_BYTES } from "@/domain/photoUpload";
import { err, ok } from "@/domain/result";
import { tempDirPerTest } from "../db/testDir";
import type { PlaceLocator } from "../weather/provider";
import { type PhotoDeps, type PhotoUpload, photoFile, uploadPhoto } from "./photos";
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

function deps(): PhotoDeps {
  return { ...harness.deps(), photosDir: photosDir(), locator: { placeAt } };
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

  it.each([
    ["answers weather-failed", () => placeAt.mockResolvedValue(err("weather-failed"))],
    ["throws", () => placeAt.mockRejectedValue(new Error("socket hang up"))],
  ])(
    "D22 logs a lookup that %s, leaves the place empty and still saves the photo",
    async (_, fail) => {
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});
      fail();

      const photo = await saved(await jpeg({ exif: CANNON_BEACH_GPS }));

      expect(photo.sources.place).toBe("none");
      expect(logged).toHaveBeenCalled();
      logged.mockRestore();
    },
  );

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

  it("D12 keeps the original and makes WebP display (≤ 2560 px) and thumb (≤ 640 px) copies", async () => {
    const bytes = await jpeg({ width: 3000, height: 1500 });

    const photo = await saved(bytes);

    const orig = await photoFile(deps(), MARIA, photo.id, "orig");
    const display = await photoFile(deps(), MARIA, photo.id, "display");
    const thumb = await photoFile(deps(), MARIA, photo.id, "thumb");
    if (!orig.ok || !display.ok || !thumb.ok) throw new Error("missing file");
    expect(readFileSync(orig.value.path)).toEqual(bytes);
    expect(await sharp(display.value.path).metadata()).toMatchObject({
      format: "webp",
      width: 2560,
      height: 1280,
    });
    expect(await sharp(thumb.value.path).metadata()).toMatchObject({
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
    expect(await sharp(display.value.path).metadata()).toMatchObject({ width: 20, height: 40 });
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

  it("PHOTO-04 refuses image bytes it can't decode and keeps nothing", async () => {
    const answer = await uploadPhoto(deps(), MARIA, upload(Buffer.from("not really a jpeg")));

    expect(answer).toEqual({ ok: false, error: "not-a-photo" });
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

  it("SYNC-02 the saved photo reaches other displays through the pull", async () => {
    const photo = await saved(await jpeg());

    expect((await pullChanges(harness.deps(), MARIA, 0)).changes).toEqual([
      { entity: "photos", row: photo },
    ]);
  });
});

describe("photoFile", () => {
  it("tech§6.3 serves the copies as WebP and the original with its own type", async () => {
    const photo = await saved(await jpeg());

    const display = await photoFile(deps(), MARIA, photo.id, "display");
    const thumb = await photoFile(deps(), MARIA, photo.id, "thumb");
    const orig = await photoFile(deps(), MARIA, photo.id, "orig");

    expect([display, thumb, orig]).toEqual([
      { ok: true, value: { path: expect.any(String), contentType: "image/webp" } },
      { ok: true, value: { path: expect.any(String), contentType: "image/webp" } },
      { ok: true, value: { path: expect.any(String), contentType: "image/jpeg" } },
    ]);
    expect(path.basename(display.ok ? display.value.path : "")).toBe(`${photo.id}.display`);
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
