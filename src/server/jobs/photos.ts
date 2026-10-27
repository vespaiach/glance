import "server-only";
import { logError } from "../log";
import type { ServiceDeps } from "../services/deps";
import {
  objectKey,
  originalKey,
  PHOTO_VARIANTS,
  photoIdOf,
  photoKeys,
  type RemoveFailure,
  removeAccountFiles,
} from "../services/photos";
import type { PhotoStore } from "../storage/store";

type PhotoJobDeps = Pick<ServiceDeps, "db"> & { store: PhotoStore };

export async function removeDeletedPhotoFiles({ db, store }: PhotoJobDeps): Promise<void> {
  const filePaths = await db.photos.deletedPaths();

  const failures: RemoveFailure[] = [];

  for (const filePath of filePaths) {
    await store
      .remove(photoKeys(filePath))
      .then(() => db.photos.filesRemoved(filePath))
      .catch((error) => failures.push({ photoId: photoIdOf(filePath), error }));
  }

  failures.push(...(await removeAccountFiles({ db, store }, await db.photos.cleanupPaths())));

  for (const { photoId, error } of failures)
    logError("job", "cleanup-failed", error, { job: "removeDeletedPhotoFiles", photoId });
}

export async function removePhotoOriginals({ db, store }: PhotoJobDeps): Promise<void> {
  const filePaths = await db.photos.livePaths();

  for (const filePath of filePaths) await store.remove([originalKey(filePath)]);
}

export async function backfillPhotoBytes({ db, store }: PhotoJobDeps): Promise<void> {
  const filePaths = await db.photos.unsizedPaths();

  for (const filePath of filePaths)
    await db.photos.sized(filePath, await storedSize(store, filePath));
}

async function storedSize(store: PhotoStore, filePath: string): Promise<number> {
  const sizes = await Promise.all(
    PHOTO_VARIANTS.map((variant) => objectSize(store, objectKey(filePath, variant))),
  );

  return sizes.reduce((sum, size) => sum + size, 0);
}

async function objectSize(store: PhotoStore, key: string): Promise<number> {
  const found = await store.get(key);

  if (!found.ok) return 0;

  await found.value.body.cancel();

  return found.value.size;
}
