import "server-only";
import exifReader from "exif-reader";
import sharp from "sharp";
import { uuidv7 } from "@/domain/id";
import { type PhotoDetails, type PhotoFacts, photoDetails } from "@/domain/photoName";
import { MAX_PHOTO_BYTES, type UploadProblem, uploadProblem } from "@/domain/photoUpload";
import { err, ok, type Result } from "@/domain/result";
import type { Photo, Synced } from "@/domain/schemas";
import type { PhotoUsage } from "@/domain/storage";
import { type PhotoStore, photoType, type StoredObject } from "../storage/store";
import { placeLabel } from "../weather/places";
import type { Coordinates, PlaceLocator, PlaceName } from "../weather/provider";
import type { ServiceDeps } from "./deps";
import { accountTimeZone, type Stamp, stamp } from "./rows";
import { roundedPoint } from "./weather";

export type SyncedPhoto = Synced<Photo>;

export const PHOTO_VARIANTS = ["display", "thumb"] as const;

export type PhotoVariant = (typeof PHOTO_VARIANTS)[number];

export type PhotoDeps = ServiceDeps & {
  store: PhotoStore;
  locator: PlaceLocator;
  storageLimit: number;
};

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

type SavedDetails = PhotoDetails & { fileName: string; bytes: number };

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

  const bytes = storedSize(decoded.value.objects);

  const { used, limit } = await photoUsage(deps, accountId);

  if (used + bytes > limit) return err("storage-full");

  const id = uuidv7(deps.now());

  const details = await detailsOf(deps, accountId, upload, decoded.value.metadata);

  return ok(await savePhoto(deps, accountId, id, decoded.value.objects, { ...details, bytes }));
}

export async function photoUsage(
  { db, storageLimit }: Pick<PhotoDeps, "db" | "storageLimit">,
  accountId: string,
): Promise<PhotoUsage> {
  return { used: await db.photos.usage(accountId), limit: storageLimit };
}

export function putPhoto(
  { db, now }: ServiceDeps,
  accountId: string,
  photo: Photo,
): Promise<Result<SyncedPhoto, "not-found">> {
  return db.tx(async (tx): Promise<Result<SyncedPhoto, "not-found">> => {
    const existing = await tx.photos.find(accountId, photo.id);

    if (!existing) return err("not-found");

    if (existing.deletedAt) return ok(existing);

    const edited = editedPhoto(existing, photo, await stamp(tx, now()));

    await tx.photos.save(accountId, edited);

    return ok(edited);
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
  const filePath = await db.photos.livePath(accountId, id);

  if (filePath === undefined) return err("not-found");

  return store.get(objectKey(filePath, variant));
}

export function photoKeys(filePath: string): string[] {
  return [...PHOTO_VARIANTS.map((variant) => objectKey(filePath, variant)), originalKey(filePath)];
}

export function originalKey(filePath: string): string {
  return `${filePath}.orig`;
}

function editedPhoto(existing: SyncedPhoto, photo: Photo, stamped: Stamp): SyncedPhoto {
  return {
    id: existing.id,
    title: photo.title,
    ...(photo.takenOn !== undefined && { takenOn: photo.takenOn }),
    ...(photo.place !== undefined && { place: photo.place }),
    createdAt: existing.createdAt,
    sources: photo.sources,
    checked: photo.checked,
    ...(existing.fileName !== undefined && { fileName: existing.fileName }),
    ...stamped,
  };
}

function tombstonePhoto(
  { db, now }: ServiceDeps,
  accountId: string,
  id: string,
): Promise<Result<SyncedPhoto, "not-found">> {
  return db.tx(async (tx): Promise<Result<SyncedPhoto, "not-found">> => {
    const existing = await tx.photos.find(accountId, id);

    if (!existing) return err("not-found");

    if (existing.deletedAt) return ok(existing);

    const { updatedAt, version } = await stamp(tx, now());

    const deleted = { ...existing, deletedAt: updatedAt, updatedAt, version };

    await tx.photos.save(accountId, deleted);

    return ok(deleted);
  });
}

function photoPath(accountId: string, id: string): string {
  return `${accountId}/${id}`;
}

export function objectKey(filePath: string, variant: PhotoVariant): string {
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

  if (!photoType(metadata.format)) return err("not-a-photo");

  const [display, thumb] = await Promise.all([
    webpCopy(original, COPY_MAX_PX.display),
    webpCopy(original, COPY_MAX_PX.thumb),
  ]);

  return ok({
    objects: {
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
  details: SavedDetails,
): Promise<SyncedPhoto> {
  try {
    await putObjects(deps.store, photoPath(accountId, id), objects);

    return await insertPhoto(deps, accountId, id, details);
  } catch (error) {
    await removeObjectsLogged(deps.store, photoPath(accountId, id));

    throw error;
  }
}

function storedSize(objects: PhotoObjects): number {
  return PHOTO_VARIANTS.reduce((sum, variant) => sum + objects[variant].body.length, 0);
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
  details: SavedDetails,
): Promise<SyncedPhoto> {
  return db.tx(async (tx): Promise<SyncedPhoto> => {
    const { updatedAt, version } = await stamp(tx, now());

    const photo: SyncedPhoto = {
      id,
      title: details.title,
      ...(details.takenOn !== undefined && { takenOn: details.takenOn }),
      ...(details.place !== undefined && { place: details.place }),
      createdAt: updatedAt,
      sources: details.sources,
      checked: details.checked,
      fileName: details.fileName,
      updatedAt,
      version,
    };

    await tx.photos.insert(accountId, photo, photoPath(accountId, id), details.bytes);

    return photo;
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
