import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import type { Result } from "@/domain/result";
import type { StoredPhoto } from "../db";
import type { UploadError } from "../sync/transport";
import { isLive } from "./outbox";
import { type PhotoVariant, type RepoStore, useRepoStore } from "./store";

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

export function apiPhotoSrc(photoId: string, variant: PhotoVariant): string {
  return `/api/photos/${photoId}/file?v=${variant}`;
}

export function usePhotoSrc(): RepoStore["photoSrc"] {
  return useRepoStore().photoSrc;
}
