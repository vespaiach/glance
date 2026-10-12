import { useLiveQuery } from "dexie-react-hooks";
import type { StoredPhoto } from "../db";
import { isLive } from "./outbox";
import { type PhotoVariant, type RepoStore, useRepoStore } from "./store";

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
