import type { ReactNode } from "react";
import { type Mock, vi } from "vitest";
import { err, type Result } from "@/domain/result";
import { CURSOR_KEY, deleteGlanceDb, type GlanceDb, openGlanceDb } from "../db";
import { STATUS_KEY, type SyncStatus } from "../sync/status";
import type { Transport, TransportError } from "../sync/transport";
import { RepoProvider, type RepoStore } from "./store";

export const TEST_ACCOUNT = "0195f0a0-0000-7000-8000-00000000000a";

export const TEST_NOW = new Date("2026-10-09T17:41:00.000Z");

export type Harness = RepoStore & {
  nudge: Mock<() => void>;
  refreshWeather: Mock<() => void>;
  refreshNow: Mock<() => Promise<boolean>>;
  upload: Mock<Transport["upload"]>;
  places: Mock<Transport["places"]>;
  locate: Mock<Transport["locate"]>;
  displays: Mock<Transport["displays"]>;
  photoUsage: Mock<Transport["photoUsage"]>;
  issueQr: Mock<Transport["issueQr"]>;
  voidQr: Mock<Transport["voidQr"]>;
  webPush: {
    key: Mock<Transport["webPush"]["key"]>;
    subscribe: Mock<Transport["webPush"]["subscribe"]>;
    unsubscribe: Mock<Transport["webPush"]["unsubscribe"]>;
  };
  imports: {
    upload: Mock<Transport["imports"]["upload"]>;
    staged: Mock<Transport["imports"]["staged"]>;
    commit: Mock<Transport["imports"]["commit"]>;
    last: Mock<Transport["imports"]["last"]>;
    undo: Mock<Transport["imports"]["undo"]>;
  };
  apiKey: {
    get: Mock<Transport["apiKey"]["get"]>;
    create: Mock<Transport["apiKey"]["create"]>;
    revoke: Mock<Transport["apiKey"]["revoke"]>;
  };
  signOut: Mock<() => Promise<void>>;
  signOutAll: Mock<() => Promise<Result<void, TransportError>>>;
  deleteAccount: Mock<() => Promise<Result<void, TransportError>>>;
  markSignedOut: Mock<() => Promise<void>>;
  markRevoked: Mock<() => Promise<void>>;
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
    refreshNow: vi.fn<() => Promise<boolean>>(async () => true),
    photoSrc: (photoId, variant) => `/photos/${photoId}/${variant}`,
    upload: vi.fn<Transport["upload"]>(async () => err("network")),
    places: vi.fn<Transport["places"]>(async () => err("network")),
    locate: vi.fn<Transport["locate"]>(async () => err("network")),
    displays: vi.fn<Transport["displays"]>(async () => err("network")),
    photoUsage: vi.fn<Transport["photoUsage"]>(async () => err("network")),
    issueQr: vi.fn<Transport["issueQr"]>(async () => err("network")),
    voidQr: vi.fn<Transport["voidQr"]>(async () => err("network")),
    webPush: {
      key: vi.fn<Transport["webPush"]["key"]>(async () => err("network")),
      subscribe: vi.fn<Transport["webPush"]["subscribe"]>(async () => err("network")),
      unsubscribe: vi.fn<Transport["webPush"]["unsubscribe"]>(async () => err("network")),
    },
    imports: {
      upload: vi.fn<Transport["imports"]["upload"]>(async () => err("network")),
      staged: vi.fn<Transport["imports"]["staged"]>(async () => err("network")),
      commit: vi.fn<Transport["imports"]["commit"]>(async () => err("network")),
      last: vi.fn<Transport["imports"]["last"]>(async () => err("network")),
      undo: vi.fn<Transport["imports"]["undo"]>(async () => err("network")),
    },
    apiKey: {
      get: vi.fn<Transport["apiKey"]["get"]>(async () => err("network")),
      create: vi.fn<Transport["apiKey"]["create"]>(async () => err("network")),
      revoke: vi.fn<Transport["apiKey"]["revoke"]>(async () => err("network")),
    },
    signOut: vi.fn<() => Promise<void>>(async () => {}),
    signOutAll: vi.fn<() => Promise<Result<void, TransportError>>>(async () => err("network")),
    deleteAccount: vi.fn<() => Promise<Result<void, TransportError>>>(async () => err("network")),
    markSignedOut: vi.fn<() => Promise<void>>(async () => {}),
    markRevoked: vi.fn<() => Promise<void>>(async () => {}),
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
