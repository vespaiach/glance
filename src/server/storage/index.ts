import "server-only";
import path from "node:path";
import { env } from "../env";
import { createDiskStore } from "./disk";
import { createS3Store } from "./s3";
import type { PhotoStore, PhotoStoreConfig } from "./store";

export type { PhotoStore, PhotoStoreConfig, StoredObject } from "./store";

let shared: PhotoStore | undefined;

export function createPhotoStore(
  config: PhotoStoreConfig,
  fetchImpl: typeof fetch = fetch,
): PhotoStore {
  switch (config.kind) {
    case "disk":
      return createDiskStore(path.join(config.dataDir, "photos"));
    case "s3":
      return createS3Store(config, fetchImpl);
    case "r2":
      return createS3Store(
        {
          bucket: config.bucket,
          region: "auto",
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        },
        fetchImpl,
      );
  }
}

export function photoStore(): PhotoStore {
  shared ??= createPhotoStore(env().storage);

  return shared;
}
