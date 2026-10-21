import "server-only";
import type { ServiceDeps } from "../services/deps";
import { photoKeys } from "../services/photos";
import type { PhotoStore } from "../storage/store";

type PhotoJobDeps = Pick<ServiceDeps, "db"> & { store: PhotoStore };

export async function removeDeletedPhotoFiles({ db, store }: PhotoJobDeps): Promise<void> {
  const rows = await db.all<{ file_path: string }>(
    "SELECT file_path FROM photos WHERE deleted_at IS NOT NULL",
  );

  const failures: unknown[] = [];

  for (const row of rows)
    await store.remove(photoKeys(row.file_path)).catch((error) => failures.push(error));

  if (failures.length > 0) throw failures[0];
}
