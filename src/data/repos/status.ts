import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { CURSOR_KEY, type GlanceDb } from "../db";
import { INITIAL_STATUS, STATUS_KEY, type SyncStatus, type WeatherStatus } from "../sync/status";
import { useRepoStore } from "./store";

export type { SyncStatus, WeatherStatus };

export type SourceStatus = {
  everSynced: boolean;
  failed: boolean;
  lastSyncedAt?: string;
  retryAt?: string;
  since: Date;
  weather: WeatherStatus;
};

export type Retry = { sync(): void; weather(): void };

async function readStatus(db: GlanceDb): Promise<SyncStatus> {
  return ((await db.meta.get(STATUS_KEY))?.value as SyncStatus | undefined) ?? INITIAL_STATUS;
}

function sourceStatus(status: SyncStatus, everSynced: boolean, since: Date): SourceStatus {
  const { online, error, lastSyncedAt, retryAt, weather } = status;

  return {
    everSynced,
    failed: error !== undefined || !online,
    ...(lastSyncedAt !== undefined && { lastSyncedAt }),
    ...(retryAt !== undefined && { retryAt }),
    since,
    weather,
  };
}

export function useSyncStatus(): SyncStatus | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(() => readStatus(db), [db]);
}

export function useSignedOut(): boolean {
  return useSyncStatus()?.error === "unauthorized";
}

export function useOutboxEmpty(): boolean | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(async () => (await db.outbox.count()) === 0, [db]);
}

export function useSourceStatus(): SourceStatus | undefined {
  const { db, startedAt } = useRepoStore();

  return useLiveQuery(async () => {
    const everSynced = (await db.meta.get(CURSOR_KEY)) !== undefined;

    return sourceStatus(await readStatus(db), everSynced, startedAt);
  }, [db, startedAt]);
}

export function useRetry(): Retry {
  const { nudge, refreshWeather } = useRepoStore();

  return useMemo(
    () => ({ sync: () => void nudge(), weather: () => void refreshWeather() }),
    [nudge, refreshWeather],
  );
}
