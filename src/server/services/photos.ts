import "server-only";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import exifReader from "exif-reader";
import sharp from "sharp";
import { uuidv7 } from "@/domain/id";
import { type PhotoDetails, type PhotoFacts, photoDetails } from "@/domain/photoName";
import { MAX_PHOTO_BYTES, type UploadProblem, uploadProblem } from "@/domain/photoUpload";
import { err, ok, type Result } from "@/domain/result";
import type { Photo, PhotoSources, Synced } from "@/domain/schemas";
import { placeLabel } from "../weather/places";
import type { Coordinates, PlaceLocator, PlaceName } from "../weather/provider";
import type { ServiceDeps } from "./deps";
import { accountTimeZone, optional, type ServerColumns, serverFields, stamp } from "./rows";
import { roundedPoint } from "./weather";

export type SyncedPhoto = Synced<Photo>;

export type PhotoRow = ServerColumns & {
  id: string;
  title: string;
  taken_on: string | null;
  place: string | null;
  created_at: string;
  title_source: PhotoSources["title"];
  date_source: PhotoSources["takenOn"];
  place_source: PhotoSources["place"];
  checked: boolean;
};

export const PHOTO_VARIANTS = ["display", "thumb", "orig"] as const;

export type PhotoVariant = (typeof PHOTO_VARIANTS)[number];

export type PhotoDeps = ServiceDeps & { photosDir: string; locator: PlaceLocator };

export type PhotoUpload = {
  name: string;
  type: string;
  size: number | undefined;
  modifiedOn?: string;
  body: AsyncIterable<Uint8Array>;
};

type FileMetadata = PhotoFacts["metadata"] & { gps?: Coordinates };

export type PhotoFile = { path: string; contentType: string };

type StoredFiles = (variant: PhotoVariant) => string;

const COPY_MAX_PX = { display: 2560, thumb: 640 } as const;

const PHOTO_TYPES: Partial<Record<string, string>> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  heif: "image/heif",
  tiff: "image/tiff",
};

class TooLargeError extends Error {}

export async function uploadPhoto(
  deps: PhotoDeps,
  accountId: string,
  upload: PhotoUpload,
): Promise<Result<SyncedPhoto, UploadProblem>> {
  const problem = uploadProblem({ type: upload.type, size: upload.size ?? 0 });

  if (problem) return err(problem);

  const id = uuidv7(deps.now());

  const files = storedFiles(deps.photosDir, accountId, id);

  const stored = await storeOriginal(upload.body, files);

  if (!stored.ok) return stored;

  const metadata = await makeCopies(files);

  if (!metadata.ok) return metadata;

  const details = photoDetails({
    fileName: upload.name,
    fileDate: upload.modifiedOn ?? (await uploadDay(deps, accountId)),
    metadata: metadata.value,
    ...(await placeOf(deps.locator, metadata.value.gps)),
  });

  return ok(await insertPhoto(deps, accountId, id, details));
}

export async function photoFile(
  { db, photosDir }: PhotoDeps,
  accountId: string,
  id: string,
  variant: PhotoVariant,
): Promise<Result<PhotoFile, "not-found">> {
  const row = await db.one<{ file_path: string }>(
    "SELECT file_path FROM photos WHERE id = $1 AND account_id = $2",
    [id, accountId],
  );

  if (!row) return err("not-found");

  const file = path.join(photosDir, `${row.file_path}.${variant}`);

  return ok({
    path: file,
    contentType: variant === "orig" ? await originalType(file) : "image/webp",
  });
}

export function toPhoto(row: PhotoRow): SyncedPhoto {
  return {
    id: row.id,
    title: row.title,
    takenOn: row.taken_on ?? row.created_at.slice(0, 10),
    ...optional("place", row.place),
    createdAt: row.created_at,
    sources: { title: row.title_source, takenOn: row.date_source, place: row.place_source },
    checked: row.checked,
    ...serverFields(row),
  };
}

function storedFiles(photosDir: string, accountId: string, id: string): StoredFiles {
  return (variant) => path.join(photosDir, accountId, `${id}.${variant}`);
}

async function storeOriginal(
  body: AsyncIterable<Uint8Array>,
  files: StoredFiles,
): Promise<Result<void, "too-large">> {
  const original = files("orig");

  await mkdir(path.dirname(original), { recursive: true });

  try {
    await pipeline(Readable.from(body), byteLimit(MAX_PHOTO_BYTES), createWriteStream(original));

    return ok(undefined);
  } catch (error) {
    await rm(original, { force: true });

    if (error instanceof TooLargeError) return err("too-large");

    throw error;
  }
}

function byteLimit(max: number): Transform {
  let seen = 0;

  return new Transform({
    transform(chunk: Buffer, _encoding, done) {
      seen += chunk.length;

      done(seen > max ? new TooLargeError() : null, seen > max ? undefined : chunk);
    },
  });
}

async function makeCopies(files: StoredFiles): Promise<Result<FileMetadata, "not-a-photo">> {
  const copied = await copiesOf(files).catch(() => err("not-a-photo" as const));

  if (!copied.ok) await removeFiles(files);

  return copied;
}

async function copiesOf(files: StoredFiles): Promise<Result<FileMetadata, "not-a-photo">> {
  const metadata = await sharp(files("orig")).metadata();

  if (!PHOTO_TYPES[metadata.format]) return err("not-a-photo");

  await Promise.all([
    webpCopy(files("orig"), files("display"), COPY_MAX_PX.display),
    webpCopy(files("orig"), files("thumb"), COPY_MAX_PX.thumb),
  ]);

  return ok(exifMetadata(metadata.exif));
}

function webpCopy(original: string, target: string, maxPx: number) {
  return sharp(original)
    .rotate()
    .resize({ width: maxPx, height: maxPx, fit: "inside", withoutEnlargement: true })
    .webp()
    .toFile(target);
}

type ExifTags = ReturnType<typeof exifReader>;

function exifMetadata(exif: Buffer | undefined): FileMetadata {
  if (!exif) return {};

  try {
    const tags = exifReader(exif);

    return {
      ...definedEntry("title", exifTitle(tags)),
      ...definedEntry("takenOn", exifDay(tags)),
      ...definedEntry("gps", exifGps(tags)),
    };
  } catch {
    return {};
  }
}

function definedEntry<K extends string, T>(key: K, value: T | undefined) {
  return (value === undefined ? {} : { [key]: value }) as { [P in K]?: T };
}

function exifTitle({ Image }: ExifTags): string | undefined {
  const description = Image?.ImageDescription;

  if (typeof description === "string" && description.trim() !== "") return description;

  const title = Image?.XPTitle;

  if (!Array.isArray(title)) return undefined;

  return Buffer.from(title).toString("utf16le").replace(/\0+$/, "");
}

function exifDay({ Photo }: ExifTags): string | undefined {
  const taken = Photo?.DateTimeOriginal ?? Photo?.DateTimeDigitized;

  return taken instanceof Date && !Number.isNaN(taken.getTime())
    ? taken.toISOString().slice(0, 10)
    : undefined;
}

function degrees(parts: unknown, ref: unknown, negative: string): number | undefined {
  if (!Array.isArray(parts) || parts.length !== 3) return undefined;

  const [d, m, s] = parts.map(Number) as [number, number, number];

  const value = d + m / 60 + s / 3600;

  if (!Number.isFinite(value)) return undefined;

  return ref === negative ? -value : value;
}

function exifGps({ GPSInfo }: ExifTags): Coordinates | undefined {
  const lat = degrees(GPSInfo?.GPSLatitude, GPSInfo?.GPSLatitudeRef, "S");

  const lon = degrees(GPSInfo?.GPSLongitude, GPSInfo?.GPSLongitudeRef, "W");

  if (lat === undefined || lon === undefined || (lat === 0 && lon === 0)) return undefined;

  return { lat, lon };
}

async function lookUpPlace(
  locator: PlaceLocator,
  gps: Coordinates,
): Promise<PlaceName | undefined> {
  try {
    const found = await locator.placeAt(roundedPoint(gps));

    if (!found.ok && found.error === "weather-failed") console.error("Photo place lookup failed");

    return found.ok ? found.value : undefined;
  } catch (error) {
    console.error(error);

    return undefined;
  }
}

async function placeOf(
  locator: PlaceLocator,
  gps: Coordinates | undefined,
): Promise<Pick<PhotoFacts, "place">> {
  const place = gps && (await lookUpPlace(locator, gps));

  return place ? { place: { city: place.name, label: placeLabel(place) } } : {};
}

async function removeFiles(files: StoredFiles): Promise<void> {
  await Promise.all(PHOTO_VARIANTS.map((variant) => rm(files(variant), { force: true })));
}

function insertPhoto(
  { db, now }: PhotoDeps,
  accountId: string,
  id: string,
  details: PhotoDetails,
): Promise<SyncedPhoto> {
  return db.tx(async (tx): Promise<SyncedPhoto> => {
    const { updatedAt, version } = await stamp(tx, now());

    const row: PhotoRow = {
      id,
      title: details.title,
      taken_on: details.takenOn,
      place: details.place ?? null,
      created_at: updatedAt,
      updated_at: updatedAt,
      deleted_at: null,
      version,
      title_source: details.sources.title,
      date_source: details.sources.takenOn,
      place_source: details.sources.place,
      checked: details.checked,
    };

    await tx.run(
      `INSERT INTO photos (id, account_id, title, taken_on, place, file_path, created_at, updated_at,
         version, title_source, date_source, place_source, checked)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11, $12)`,
      [
        row.id,
        accountId,
        row.title,
        row.taken_on,
        row.place,
        path.join(accountId, id),
        row.created_at,
        row.version,
        row.title_source,
        row.date_source,
        row.place_source,
        row.checked,
      ],
    );

    return toPhoto(row);
  });
}

async function uploadDay({ db, now }: PhotoDeps, accountId: string): Promise<string> {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: await accountTimeZone(db, accountId),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now());
}

async function originalType(file: string): Promise<string> {
  const { format } = await sharp(file).metadata();

  return PHOTO_TYPES[format] ?? "application/octet-stream";
}
