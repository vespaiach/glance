import { createContext, type ReactNode, useContext } from "react";
import type { Result } from "@/domain/result";
import type { Account } from "@/domain/schemas";
import type { GlanceDb } from "../db";
import type { PhotoVariant } from "../sw/rules";
import type { Transport, TransportError } from "../sync/transport";

export type { PhotoVariant };

export type StoreAccount = Pick<Account, "name" | "email">;

export type RepoStore = {
  db: GlanceDb;
  accountId: string;
  account: StoreAccount;
  now: () => Date;
  startedAt: Date;
  nudge: () => unknown;
  refreshWeather: () => unknown;
  photoSrc: (photoId: string, variant: PhotoVariant) => string;
  upload: Transport["upload"];
  places: Transport["places"];
  locate: Transport["locate"];
  displays: Transport["displays"];
  photoUsage: Transport["photoUsage"];
  issueQr: Transport["issueQr"];
  voidQr: Transport["voidQr"];
  webPush: Transport["webPush"];
  imports: Transport["imports"];
  apiKey: Transport["apiKey"];
  signOut: () => Promise<void>;
  signOutAll: () => Promise<Result<void, TransportError>>;
  deleteAccount: () => Promise<Result<void, TransportError>>;
  markSignedOut: () => Promise<void>;
  markRevoked: () => Promise<void>;
};

const RepoContext = createContext<RepoStore | undefined>(undefined);

export function RepoProvider({ store, children }: { store: RepoStore; children: ReactNode }) {
  return <RepoContext value={store}>{children}</RepoContext>;
}

export function useRepoStore(): RepoStore {
  const store = useContext(RepoContext);

  if (store === undefined) throw new Error("useRepoStore needs a RepoProvider");

  return store;
}

export function useAccount(): StoreAccount {
  return useRepoStore().account;
}

export function useSignOut(): RepoStore["signOut"] {
  return useRepoStore().signOut;
}

export function useSignOutAll(): RepoStore["signOutAll"] {
  return useRepoStore().signOutAll;
}

export function useDeleteAccount(): RepoStore["deleteAccount"] {
  return useRepoStore().deleteAccount;
}

export function useMarkSignedOut(): RepoStore["markSignedOut"] {
  return useRepoStore().markSignedOut;
}

export function useMarkRevoked(): RepoStore["markRevoked"] {
  return useRepoStore().markRevoked;
}
