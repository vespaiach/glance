import "server-only";
import type { ServiceDeps } from "../services/deps";
import { photoFilesOf, removeFiles } from "../services/photos";

type PhotoJobDeps = Pick<ServiceDeps, "db"> & { photosDir: string };

export async function removeDeletedPhotoFiles({ db, photosDir }: PhotoJobDeps): Promise<void> {
  const rows = await db.all<{ file_path: string }>(
    "SELECT file_path FROM photos WHERE deleted_at IS NOT NULL",
  );

  for (const row of rows) await removeFiles(photoFilesOf(photosDir, row.file_path));
}
