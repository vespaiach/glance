import { useReducer } from "react";
import { useRefreshNow, useSyncStatus } from "@/data/repos";
import { useBrowserOnline } from "@/shell/providers/network";
import { REFRESH_IDLE, type RefreshData, refreshData } from "./refreshData";

const MINUTE_MS = 60_000;

export type RefreshDataRow = {
  online: boolean;
  refresh: RefreshData;
  updatedMinutes?: number;
  onRefresh: () => void;
};

export function useRefreshData(now: Date): RefreshDataRow {
  const refreshNow = useRefreshNow();

  const lastSyncedAt = useSyncStatus()?.lastSyncedAt;

  const online = useBrowserOnline();

  const [refresh, dispatch] = useReducer(refreshData, REFRESH_IDLE);

  const start = async () => {
    if (refresh.kind === "busy") return;

    dispatch({ type: "refresh" });

    dispatch({ type: (await refreshNow()) ? "refreshed" : "failed" });
  };

  return {
    online,
    refresh,
    ...(lastSyncedAt !== undefined && { updatedMinutes: minutesSince(lastSyncedAt, now) }),
    onRefresh: () => void start(),
  };
}

function minutesSince(at: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(at)) / MINUTE_MS));
}
