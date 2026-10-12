import { useLiveQuery } from "dexie-react-hooks";
import type { StoredPhoto } from "../db";
import { isLive } from "./outbox";
import { useRepoStore } from "./store";

export function usePhotos(): StoredPhoto[] | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(() => db.photos.orderBy("createdAt").filter(isLive).toArray(), [db]);
}
