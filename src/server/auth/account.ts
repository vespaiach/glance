import "server-only";
import { err, ok, type Result } from "@/domain/result";
import type { Account } from "@/domain/schemas";
import type { AccountRecord } from "../db";
import { removeAccountFiles } from "../services/photos";
import { addFirstTag, type SyncedTag } from "../services/tags";
import type { PhotoStore } from "../storage/store";
import type { Clocked } from "./deps";
import { signOutAll } from "./sessions";

export type NamedAccount = { account: Account; firstTag?: SyncedTag };

export function toAccount(record: AccountRecord): Account {
  return { id: record.id, email: record.email, name: record.name };
}

export function saveName(
  { db, now }: Clocked,
  accountId: string,
  name: string,
): Promise<Result<NamedAccount, "not-found">> {
  return db.tx(async (tx): Promise<Result<NamedAccount, "not-found">> => {
    await tx.accounts.rename(accountId, name.trim());

    const account = await tx.accounts.byId(accountId);

    if (!account) return err("not-found");

    const firstTag = await addFirstTag({ db: tx, now }, accountId, name.trim());

    return ok({ account: toAccount(account), ...(firstTag && { firstTag }) });
  });
}

export async function deleteAccount(
  { db, now, store }: Clocked & { store: PhotoStore },
  accountId: string,
): Promise<void> {
  const filePaths = await db.tx(async (tx) => {
    await signOutAll({ db: tx, now }, accountId);

    return tx.accounts.erase(accountId, now().toISOString());
  });

  const failures = await removeAccountFiles({ db, store }, filePaths);

  for (const failure of failures) console.error(failure);
}

export async function finishSetup({ db, now }: Clocked, accountId: string): Promise<void> {
  await db.accounts.finishSetup(accountId, now().toISOString());
}
