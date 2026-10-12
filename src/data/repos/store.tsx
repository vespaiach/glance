import { createContext, type ReactNode, useContext } from "react";
import type { Account } from "@/domain/schemas";
import type { GlanceDb } from "../db";

export type PhotoVariant = "display" | "thumb" | "orig";

export type StoreAccount = Pick<Account, "name" | "email">;

export type RepoStore = {
  db: GlanceDb;
  accountId: string;
  account: StoreAccount;
  now: () => Date;
  nudge: () => unknown;
  photoSrc: (photoId: string, variant: PhotoVariant) => string;
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
