import "server-only";
import type { Result } from "@/domain/result";

export type StoredObject = { body: ReadableStream<Uint8Array>; size: number; contentType: string };

export type PhotoStore = {
  put(key: string, body: Uint8Array<ArrayBuffer>, contentType: string): Promise<void>;
  get(key: string): Promise<Result<StoredObject, "not-found">>;
  remove(keys: string[]): Promise<void>;
};

export type S3Config = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
};

export type PhotoStoreConfig =
  | { kind: "disk"; dataDir: string }
  | ({ kind: "s3" } & S3Config)
  | {
      kind: "r2";
      accountId: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
    };

const PHOTO_TYPES: Partial<Record<string, string>> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  heif: "image/heif",
  tiff: "image/tiff",
};

export function photoType(format: string): string | undefined {
  return PHOTO_TYPES[format];
}
