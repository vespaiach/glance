import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { type PictureOfDayPick, pictureOfDay } from "@/domain/pictureOfDay";
import type { Result } from "@/domain/result";
import type { Photo } from "@/domain/schemas";
import type { StoredPhoto } from "../db";
import { photoFileUrl } from "../sw/rules";
import type { UploadError } from "../sync/transport";
import { isLive, putQueued, removeQueued } from "./outbox";
import { type RepoStore, useRepoStore } from "./store";

export type { UploadError };

export interface PhotosRepo {
  upload(
    file: File,
    modifiedOn: string,
    onProgress: (percent: number) => void,
  ): Promise<Result<StoredPhoto, UploadError>>;
  update(photo: Photo): Promise<void>;
  remove(id: string): Promise<void>;
}

export function createPhotosRepo(store: RepoStore): PhotosRepo {
  return {
    upload: async (file, modifiedOn, onProgress) => {
      const answer = await store.upload(file, modifiedOn, onProgress);

      if (answer.ok) await store.db.photos.put(answer.value);

      return answer;
    },
    update: (photo) => putQueued<Photo>(store, "photos", photo.id, () => photo),
    remove: (id) => removeQueued(store, "photos", id),
  };
}

export function usePhotosRepo(): PhotosRepo {
  const store = useRepoStore();

  return useMemo(() => createPhotosRepo(store), [store]);
}

export function usePhotos(): StoredPhoto[] | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(() => db.photos.orderBy("createdAt").filter(isLive).toArray(), [db]);
}

export function usePhoto(id: string): StoredPhoto | null | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(async () => {
    const row = await db.photos.get(id);

    return row && isLive(row) ? row : null;
  }, [db, id]);
}

export function usePictureOfDay(dayKey: string, tz: string): PictureOfDayPick | null | undefined {
  const { db, accountId } = useRepoStore();

  const rows = useLiveQuery(() => db.photos.toArray(), [db]);

  return useMemo(
    () => rows && (pictureOfDay(rows, dayKey, tz, accountId) ?? null),
    [rows, dayKey, tz, accountId],
  );
}

export const apiPhotoSrc = photoFileUrl;

export function usePhotoSrc(): RepoStore["photoSrc"] {
  return useRepoStore().photoSrc;
}
