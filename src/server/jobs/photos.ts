import "server-only";
import type { ServiceDeps } from "../services/deps";
import { photoKeys } from "../services/photos";
import type { PhotoStore } from "../storage/store";

type PhotoJobDeps = Pick<ServiceDeps, "db"> & { store: PhotoStore };

export async function removeDeletedPhotoFiles({ db, store }: PhotoJobDeps): Promise<void> {
  const filePaths = await db.photos.deletedPaths();

  const failures: unknown[] = [];

  for (const filePath of filePaths) {
    await store
      .remove(photoKeys(filePath))
      .then(() => db.photos.filesRemoved(filePath))
      .catch((error) => failures.push(error));
  }

  if (failures.length > 0) throw failures[0];
}
