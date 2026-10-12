import "server-only";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type Database from "better-sqlite3";
import exifReader from "exif-reader";
import sharp from "sharp";
import { uuidv7 } from "@/domain/id";
import {
  MAX_PHOTO_BYTES,
  photoTitle,
  type UploadProblem,
  uploadProblem,
} from "@/domain/photoUpload";
import { err, ok, type Result } from "@/domain/result";
import type { Photo, Synced } from "@/domain/schemas";
import type { ServiceDeps } from "./deps";
import { optional, stamp } from "./rows";

export type SyncedPhoto = Synced<Photo>;

export type PhotoRow = {
  id: string;
  title: string;
  taken_on: string | null;
  place: string | null;
  created_at: string;
  version: number;
};

export const PHOTO_VARIANTS = ["display", "thumb", "orig"] as const;

export type PhotoVariant = (typeof PHOTO_VARIANTS)[number];

export type PhotoDeps = ServiceDeps & { photosDir: string };

export type PhotoUpload = {
  name: string;
  type: string;
  size: number | undefined;
  body: AsyncIterable<Uint8Array>;
};

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

  const takenOn = await makeCopies(files);

  if (!takenOn.ok) return takenOn;

  return ok(
    insertPhoto(deps, accountId, { id, title: photoTitle(upload.name), takenOn: takenOn.value }),
  );
}

export async function photoFile(
  { db, photosDir }: PhotoDeps,
  accountId: string,
  id: string,
  variant: PhotoVariant,
): Promise<Result<PhotoFile, "not-found">> {
  const row = db
    .prepare("SELECT file_path FROM photos WHERE id = ? AND account_id = ?")
    .get(id, accountId) as { file_path: string } | undefined;

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
    updatedAt: row.created_at,
    version: row.version,
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

async function makeCopies(files: StoredFiles): Promise<Result<string | undefined, "not-a-photo">> {
  const copied = await copiesOf(files).catch(() => err("not-a-photo" as const));

  if (!copied.ok) await removeFiles(files);

  return copied;
}

async function copiesOf(files: StoredFiles): Promise<Result<string | undefined, "not-a-photo">> {
  const metadata = await sharp(files("orig")).metadata();

  if (!PHOTO_TYPES[metadata.format]) return err("not-a-photo");

  await Promise.all([
    webpCopy(files("orig"), files("display"), COPY_MAX_PX.display),
    webpCopy(files("orig"), files("thumb"), COPY_MAX_PX.thumb),
  ]);

  return ok(exifDay(metadata.exif));
}

function webpCopy(original: string, target: string, maxPx: number) {
  return sharp(original)
    .rotate()
    .resize({ width: maxPx, height: maxPx, fit: "inside", withoutEnlargement: true })
    .webp()
    .toFile(target);
}

function exifDay(exif: Buffer | undefined): string | undefined {
  if (!exif) return undefined;

  try {
    const { Photo } = exifReader(exif);

    const taken = Photo?.DateTimeOriginal ?? Photo?.DateTimeDigitized;

    return taken instanceof Date && !Number.isNaN(taken.getTime())
      ? taken.toISOString().slice(0, 10)
      : undefined;
  } catch {
    return undefined;
  }
}

async function removeFiles(files: StoredFiles): Promise<void> {
  await Promise.all(PHOTO_VARIANTS.map((variant) => rm(files(variant), { force: true })));
}

function insertPhoto(
  { db, now }: PhotoDeps,
  accountId: string,
  photo: { id: string; title: string; takenOn: string | undefined },
): SyncedPhoto {
  return db.transaction((): SyncedPhoto => {
    const { updatedAt, version } = stamp(db, now());

    const row: PhotoRow = {
      id: photo.id,
      title: photo.title,
      taken_on: photo.takenOn ?? uploadDay(db, accountId, updatedAt),
      place: null,
      created_at: updatedAt,
      version,
    };

    db.prepare(
      `INSERT INTO photos (id, account_id, title, taken_on, place, file_path, created_at, version)
       VALUES (@id, @accountId, @title, @taken_on, NULL, @filePath, @created_at, @version)`,
    ).run({ ...row, accountId, filePath: path.join(accountId, photo.id) });

    return toPhoto(row);
  })();
}

function uploadDay(db: Database.Database, accountId: string, at: string): string {
  const { time_zone: timeZone } = db
    .prepare("SELECT time_zone FROM accounts WHERE id = ?")
    .get(accountId) as { time_zone: string };

  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(at));
}

async function originalType(file: string): Promise<string> {
  const { format } = await sharp(file).metadata();

  return PHOTO_TYPES[format] ?? "application/octet-stream";
}
