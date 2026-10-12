import type { ReactNode } from "react";
import { type Mock, vi } from "vitest";
import { deleteGlanceDb, type GlanceDb, openGlanceDb } from "../db";
import { STATUS_KEY, type SyncStatus } from "../sync/status";
import { RepoProvider, type RepoStore } from "./store";

export const TEST_ACCOUNT = "0195f0a0-0000-7000-8000-00000000000a";

export const TEST_NOW = new Date("2026-10-09T17:41:00.000Z");

export type Harness = RepoStore & { nudge: Mock<() => void>; close(): Promise<void> };

export function openHarness(name: string): Harness {
  const db: GlanceDb = openGlanceDb(name);

  return {
    db,
    accountId: TEST_ACCOUNT,
    now: () => TEST_NOW,
    nudge: vi.fn<() => void>(),
    close: async () => {
      db.close();

      await deleteGlanceDb(name);
    },
  };
}

export function wrapperFor(store: RepoStore) {
  return ({ children }: { children: ReactNode }) => (
    <RepoProvider store={store}>{children}</RepoProvider>
  );
}

export function synced<T>(row: T, version = 1) {
  return { ...row, updatedAt: "2026-10-01T09:00:00.000Z", version };
}

export async function putSyncStatus(store: RepoStore, status: SyncStatus): Promise<void> {
  await store.db.meta.put({ key: STATUS_KEY, value: status });
}
