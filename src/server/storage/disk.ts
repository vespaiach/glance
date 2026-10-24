import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import sharp from "sharp";
import { err, ok, type Result } from "@/domain/result";
import { type PhotoStore, photoType, type StoredObject } from "./store";

const UNKNOWN_TYPE = "application/octet-stream";

const WEBP_COPY = /\.(display|thumb)$/;

export function createDiskStore(root: string): PhotoStore {
  const fileOf = (key: string) => path.join(root, key);

  return {
    async put(key, body) {
      await mkdir(path.dirname(fileOf(key)), { recursive: true });

      await writeFile(fileOf(key), body);
    },
    get: (key) => storedFile(fileOf(key), WEBP_COPY.test(key)),
    async remove(keys) {
      const removals = await Promise.allSettled(
        keys.map((key) => rm(fileOf(key), { force: true })),
      );

      const failed = removals.find((removal) => removal.status === "rejected");

      if (failed) throw failed.reason;
    },
  };
}

async function storedFile(
  file: string,
  webpCopy: boolean,
): Promise<Result<StoredObject, "not-found">> {
  const size = await fileSize(file);

  if (size === undefined) return err("not-found");

  return ok({
    body: Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>,
    size,
    contentType: webpCopy ? "image/webp" : await sniffedType(file),
  });
}

async function fileSize(file: string): Promise<number | undefined> {
  try {
    return (await stat(file)).size;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;

    throw error;
  }
}

async function sniffedType(file: string): Promise<string> {
  try {
    const { format } = await sharp(file).metadata();

    return photoType(format) ?? UNKNOWN_TYPE;
  } catch {
    return UNKNOWN_TYPE;
  }
}
