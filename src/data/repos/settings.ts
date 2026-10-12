import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import type { AccountSettings } from "@/domain/schemas";
import type { StoredSettings } from "../db";
import { putQueued } from "./outbox";
import { type RepoStore, useRepoStore } from "./store";

export interface SettingsRepo {
  update(change: Partial<AccountSettings>): Promise<void>;
}

type SettingsRow = AccountSettings & { accountId: string };

export function createSettingsRepo(store: RepoStore): SettingsRepo {
  return {
    update: (change) =>
      putQueued<SettingsRow>(store, "settings", store.accountId, (stored) => ({
        ...DEFAULT_SETTINGS,
        ...stored,
        ...change,
        accountId: store.accountId,
      })),
  };
}

export function useSettingsRepo(): SettingsRepo {
  const store = useRepoStore();

  return useMemo(() => createSettingsRepo(store), [store]);
}

export function accountSettings(row: StoredSettings | undefined): AccountSettings {
  if (row === undefined) return DEFAULT_SETTINGS;

  const {
    accountId: _account,
    updatedAt: _updated,
    version: _version,
    deletedAt: _deleted,
    ...settings
  } = row;

  return { ...DEFAULT_SETTINGS, ...settings };
}

export function useSettings(): AccountSettings | undefined {
  const { db, accountId } = useRepoStore();

  return useLiveQuery(
    async () => accountSettings(await db.settings.get(accountId)),
    [db, accountId],
  );
}
