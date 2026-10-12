import { useLiveQuery } from "dexie-react-hooks";
import { INITIAL_STATUS, STATUS_KEY, type SyncStatus } from "../sync/status";
import { useRepoStore } from "./store";

export type { SyncStatus };

export function useSyncStatus(): SyncStatus | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(
    async () =>
      ((await db.meta.get(STATUS_KEY))?.value as SyncStatus | undefined) ?? INITIAL_STATUS,
    [db],
  );
}
