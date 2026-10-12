"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useSyncStatus } from "@/data/repos";
import { OFFLINE_PILL_DELAY_MS, offlinePillShown } from "@/domain/offline";
import { useNow } from "./now";

export type Network = {
  online: boolean;
  showOfflinePill: boolean;
  savedAt?: string;
};

const NetworkContext = createContext<Network | undefined>(undefined);

function subscribeBrowserOnline(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);

  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

function useBrowserOnline(): boolean {
  return useSyncExternalStore(
    subscribeBrowserOnline,
    () => navigator.onLine,
    () => true,
  );
}

function useOfflineSince(online: boolean, now: Date): Date | undefined {
  const [since, setSince] = useState<Date | undefined>(undefined);

  if (online && since !== undefined) setSince(undefined);

  if (!online && since === undefined) setSince(now);

  return online ? undefined : (since ?? now);
}

export function NetworkProvider({
  pillDelayMs = OFFLINE_PILL_DELAY_MS,
  children,
}: {
  pillDelayMs?: number;
  children: ReactNode;
}) {
  const status = useSyncStatus();

  const browserOnline = useBrowserOnline();

  const now = useNow();

  const online = browserOnline && (status?.online ?? true);

  const offlineSince = useOfflineSince(online, now);

  const showOfflinePill = offlinePillShown(offlineSince, now, pillDelayMs);

  const savedAt = status?.lastSyncedAt;

  const network = useMemo(
    () => ({ online, showOfflinePill, ...(savedAt !== undefined && { savedAt }) }),
    [online, showOfflinePill, savedAt],
  );

  return <NetworkContext value={network}>{children}</NetworkContext>;
}

export function useNetwork(): Network {
  const network = useContext(NetworkContext);

  if (network === undefined) throw new Error("useNetwork needs a NetworkProvider");

  return network;
}
