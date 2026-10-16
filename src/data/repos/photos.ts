import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { type PictureOfDayPick, pictureOfDay } from "@/domain/pictureOfDay";
import type { Result } from "@/domain/result";
import type { StoredPhoto } from "../db";
import { photoFileUrl } from "../sw/rules";
import type { UploadError } from "../sync/transport";
import { isLive } from "./outbox";
import { type RepoStore, useRepoStore } from "./store";

export type { UploadError };

export interface PhotosRepo {
  upload(
    file: File,
    onProgress: (percent: number) => void,
  ): Promise<Result<StoredPhoto, UploadError>>;
}

export function createPhotosRepo(store: RepoStore): PhotosRepo {
  return {
    upload: async (file, onProgress) => {
      const answer = await store.upload(file, onProgress);

      if (answer.ok) await store.db.photos.put(answer.value);

      return answer;
    },
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
