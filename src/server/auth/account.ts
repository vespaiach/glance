import "server-only";
import { err, ok, type Result } from "@/domain/result";
import type { Account } from "@/domain/schemas";
import type { AccountRecord } from "../db";
import { addFirstTag, type SyncedTag } from "../services/tags";
import type { Clocked } from "./deps";

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

export async function finishSetup({ db, now }: Clocked, accountId: string): Promise<void> {
  await db.accounts.finishSetup(accountId, now().toISOString());
}
