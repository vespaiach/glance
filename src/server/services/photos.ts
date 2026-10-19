import "server-only";
import exifReader from "exif-reader";
import sharp from "sharp";
import { uuidv7 } from "@/domain/id";
import { type PhotoDetails, type PhotoFacts, photoDetails } from "@/domain/photoName";
import { MAX_PHOTO_BYTES, type UploadProblem, uploadProblem } from "@/domain/photoUpload";
import { err, ok, type Result } from "@/domain/result";
import type { Photo, PhotoSources, Synced } from "@/domain/schemas";
import type { Db } from "../db/db";
import { type PhotoStore, photoType, type StoredObject } from "../storage/store";
import { placeLabel } from "../weather/places";
import type { Coordinates, PlaceLocator, PlaceName } from "../weather/provider";
import type { ServiceDeps } from "./deps";
import {
  accountTimeZone,
  lockVersions,
  optional,
  type ServerColumns,
  type Stamp,
  serverFields,
  stamp,
} from "./rows";
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
  file_name: string | null;
};

export const PHOTO_VARIANTS = ["display", "thumb", "orig"] as const;

export type PhotoVariant = (typeof PHOTO_VARIANTS)[number];

export type PhotoDeps = ServiceDeps & { store: PhotoStore; locator: PlaceLocator };

export type PhotoUpload = {
  name: string;
  type: string;
  size: number | undefined;
  modifiedOn?: string;
  body: AsyncIterable<Uint8Array>;
};

type FileMetadata = PhotoFacts["metadata"] & { gps?: Coordinates };

type PhotoObjects = Record<PhotoVariant, { body: Uint8Array<ArrayBuffer>; contentType: string }>;

type Decoded = { objects: PhotoObjects; metadata: FileMetadata };

const COPY_MAX_PX = { display: 2560, thumb: 640 } as const;

type ExifTags = ReturnType<typeof exifReader>;

export async function uploadPhoto(
  deps: PhotoDeps,
  accountId: string,
  upload: PhotoUpload,
): Promise<Result<SyncedPhoto, UploadProblem>> {
  const problem = uploadProblem({ type: upload.type, size: upload.size ?? 0 });

  if (problem) return err(problem);

  const original = await readLimited(upload.body, MAX_PHOTO_BYTES);

  if (!original) return err("too-large");

  const decoded = await decodePhoto(original);

  if (!decoded.ok) return decoded;

  const id = uuidv7(deps.now());

  const details = await detailsOf(deps, accountId, upload, decoded.value.metadata);

  return ok(await savePhoto(deps, accountId, id, decoded.value.objects, details));
}

export function putPhoto(
  { db, now }: ServiceDeps,
  accountId: string,
  photo: Photo,
): Promise<Result<SyncedPhoto, "not-found">> {
  return db.tx(async (tx): Promise<Result<SyncedPhoto, "not-found">> => {
    await lockVersions(tx);

    const existing = await photoRow(tx, accountId, photo.id);

    if (!existing) return err("not-found");

    if (existing.deleted_at) return ok(toPhoto(existing));

    const { updatedAt, version } = await stamp(tx, now());

    const row = editedRow(existing, photo, { updatedAt, version });

    await tx.run(
      `UPDATE photos SET title = $1, taken_on = $2, place = $3, title_source = $4, date_source = $5,
         place_source = $6, checked = $7, updated_at = $8, version = $9 WHERE id = $10`,
      [
        row.title,
        row.taken_on,
        row.place,
        row.title_source,
        row.date_source,
        row.place_source,
        row.checked,
        updatedAt,
        version,
        row.id,
      ],
    );

    return ok(toPhoto(row));
  });
}

export async function deletePhoto(
  deps: PhotoDeps,
  accountId: string,
  id: string,
): Promise<Result<SyncedPhoto, "not-found">> {
  const deleted = await tombstonePhoto(deps, accountId, id);

  if (deleted.ok) await removeObjectsLogged(deps.store, photoPath(accountId, id));

  return deleted;
}

export async function photoFile(
  { db, store }: PhotoDeps,
  accountId: string,
  id: string,
  variant: PhotoVariant,
): Promise<Result<StoredObject, "not-found">> {
  const row = await db.one<{ file_path: string }>(
    "SELECT file_path FROM photos WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL",
    [id, accountId],
  );

  if (!row) return err("not-found");

  return store.get(objectKey(row.file_path, variant));
}

export function toPhoto(row: PhotoRow): SyncedPhoto {
  return {
    id: row.id,
    title: row.title,
    ...optional("takenOn", row.taken_on),
    ...optional("place", row.place),
    createdAt: row.created_at,
    sources: { title: row.title_source, takenOn: row.date_source, place: row.place_source },
    checked: row.checked,
    ...optional("fileName", row.file_name),
    ...serverFields(row),
  };
}

export function photoKeys(filePath: string): string[] {
  return PHOTO_VARIANTS.map((variant) => objectKey(filePath, variant));
}

function photoRow(db: Db, accountId: string, id: string): Promise<PhotoRow | undefined> {
  return db.one<PhotoRow>("SELECT * FROM photos WHERE id = $1 AND account_id = $2", [
    id,
    accountId,
  ]);
}

function editedRow(existing: PhotoRow, photo: Photo, { updatedAt, version }: Stamp): PhotoRow {
  return {
    ...existing,
    title: photo.title,
    taken_on: photo.takenOn ?? null,
    place: photo.place ?? null,
    title_source: photo.sources.title,
    date_source: photo.sources.takenOn,
    place_source: photo.sources.place,
    checked: photo.checked,
    updated_at: updatedAt,
    version,
  };
}

function tombstonePhoto(
  { db, now }: ServiceDeps,
  accountId: string,
  id: string,
): Promise<Result<SyncedPhoto, "not-found">> {
  return db.tx(async (tx): Promise<Result<SyncedPhoto, "not-found">> => {
    await lockVersions(tx);

    const existing = await photoRow(tx, accountId, id);

    if (!existing) return err("not-found");

    if (existing.deleted_at) return ok(toPhoto(existing));

    const { updatedAt, version } = await stamp(tx, now());

    await tx.run("UPDATE photos SET deleted_at = $1, updated_at = $1, version = $2 WHERE id = $3", [
      updatedAt,
      version,
      id,
    ]);

    return ok(toPhoto({ ...existing, deleted_at: updatedAt, updated_at: updatedAt, version }));
  });
}

function photoPath(accountId: string, id: string): string {
  return `${accountId}/${id}`;
}

function objectKey(filePath: string, variant: PhotoVariant): string {
  return `${filePath}.${variant}`;
}

async function removeObjectsLogged(store: PhotoStore, filePath: string): Promise<void> {
  try {
    await store.remove(photoKeys(filePath));
  } catch (error) {
    console.error(error);
  }
}

async function readLimited(
  body: AsyncIterable<Uint8Array>,
  max: number,
): Promise<Uint8Array<ArrayBuffer> | undefined> {
  const chunks: Uint8Array[] = [];

  let size = 0;

  for await (const chunk of body) {
    size += chunk.length;

    if (size > max) return undefined;

    chunks.push(chunk);
  }

  return Buffer.concat(chunks, size);
}

async function decodePhoto(
  original: Uint8Array<ArrayBuffer>,
): Promise<Result<Decoded, "not-a-photo">> {
  try {
    return await decoded(original);
  } catch {
    return err("not-a-photo");
  }
}

async function decoded(original: Uint8Array<ArrayBuffer>): Promise<Result<Decoded, "not-a-photo">> {
  const metadata = await sharp(original).metadata();

  const contentType = photoType(metadata.format);

  if (!contentType) return err("not-a-photo");

  const [display, thumb] = await Promise.all([
    webpCopy(original, COPY_MAX_PX.display),
    webpCopy(original, COPY_MAX_PX.thumb),
  ]);

  return ok({
    objects: {
      orig: { body: original, contentType },
      display: { body: display, contentType: "image/webp" },
      thumb: { body: thumb, contentType: "image/webp" },
    },
    metadata: exifMetadata(metadata.exif),
  });
}

async function webpCopy(original: Uint8Array, maxPx: number): Promise<Uint8Array<ArrayBuffer>> {
  const copy = await sharp(original)
    .rotate()
    .resize({ width: maxPx, height: maxPx, fit: "inside", withoutEnlargement: true })
    .webp()
    .toBuffer();

  return new Uint8Array(copy);
}

async function detailsOf(
  deps: PhotoDeps,
  accountId: string,
  upload: PhotoUpload,
  metadata: FileMetadata,
): Promise<PhotoDetails & { fileName: string }> {
  const details = photoDetails({
    fileName: upload.name,
    fileDate: upload.modifiedOn ?? (await uploadDay(deps, accountId)),
    metadata,
    ...(await placeOf(deps.locator, metadata.gps)),
  });

  return { ...details, fileName: upload.name };
}

async function savePhoto(
  deps: PhotoDeps,
  accountId: string,
  id: string,
  objects: PhotoObjects,
  details: PhotoDetails & { fileName: string },
): Promise<SyncedPhoto> {
  try {
    await putObjects(deps.store, photoPath(accountId, id), objects);

    return await insertPhoto(deps, accountId, id, details);
  } catch (error) {
    await removeObjectsLogged(deps.store, photoPath(accountId, id));

    throw error;
  }
}

async function putObjects(store: PhotoStore, filePath: string, objects: PhotoObjects) {
  const puts = await Promise.allSettled(
    PHOTO_VARIANTS.map((variant) =>
      store.put(objectKey(filePath, variant), objects[variant].body, objects[variant].contentType),
    ),
  );

  const failed = puts.find((put) => put.status === "rejected");

  if (failed) throw failed.reason;
}

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

function insertPhoto(
  { db, now }: PhotoDeps,
  accountId: string,
  id: string,
  details: PhotoDetails & { fileName: string },
): Promise<SyncedPhoto> {
  return db.tx(async (tx): Promise<SyncedPhoto> => {
    const { updatedAt, version } = await stamp(tx, now());

    const row: PhotoRow = {
      id,
      title: details.title,
      taken_on: details.takenOn ?? null,
      place: details.place ?? null,
      created_at: updatedAt,
      updated_at: updatedAt,
      deleted_at: null,
      version,
      title_source: details.sources.title,
      date_source: details.sources.takenOn,
      place_source: details.sources.place,
      checked: details.checked,
      file_name: details.fileName,
    };

    await tx.run(
      `INSERT INTO photos (id, account_id, title, taken_on, place, file_path, created_at, updated_at,
         version, title_source, date_source, place_source, checked, file_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11, $12, $13)`,
      [
        row.id,
        accountId,
        row.title,
        row.taken_on,
        row.place,
        photoPath(accountId, id),
        row.created_at,
        row.version,
        row.title_source,
        row.date_source,
        row.place_source,
        row.checked,
        row.file_name,
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
