import type { ReactNode } from "react";
import { type Mock, vi } from "vitest";
import { err } from "@/domain/result";
import { CURSOR_KEY, deleteGlanceDb, type GlanceDb, openGlanceDb } from "../db";
import { STATUS_KEY, type SyncStatus } from "../sync/status";
import type { Transport } from "../sync/transport";
import { RepoProvider, type RepoStore } from "./store";

export const TEST_ACCOUNT = "0195f0a0-0000-7000-8000-00000000000a";

export const TEST_NOW = new Date("2026-10-09T17:41:00.000Z");

export type Harness = RepoStore & {
  nudge: Mock<() => void>;
  refreshWeather: Mock<() => void>;
  upload: Mock<Transport["upload"]>;
  places: Mock<Transport["places"]>;
  locate: Mock<Transport["locate"]>;
  signOut: Mock<() => Promise<void>>;
  markSignedOut: Mock<() => Promise<void>>;
  close(): Promise<void>;
};

export function openHarness(name: string): Harness {
  const db: GlanceDb = openGlanceDb(name);

  return {
    db,
    accountId: TEST_ACCOUNT,
    account: { name: "Maria", email: "maria@example.com" },
    now: () => TEST_NOW,
    startedAt: TEST_NOW,
    nudge: vi.fn<() => void>(),
    refreshWeather: vi.fn<() => void>(),
    photoSrc: (photoId, variant) => `/photos/${photoId}/${variant}`,
    upload: vi.fn<Transport["upload"]>(async () => err("network")),
    places: vi.fn<Transport["places"]>(async () => err("network")),
    locate: vi.fn<Transport["locate"]>(async () => err("network")),
    signOut: vi.fn<() => Promise<void>>(async () => {}),
    markSignedOut: vi.fn<() => Promise<void>>(async () => {}),
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

export async function markSynced(store: RepoStore): Promise<void> {
  await store.db.meta.put({ key: CURSOR_KEY, value: "c1" });
}
