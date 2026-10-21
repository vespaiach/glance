import "server-only";
import { err, ok, type Result } from "@/domain/result";
import type { Account } from "@/domain/schemas";
import type { Db } from "../db/db";
import { addFirstTag, type SyncedTag } from "../services/tags";
import type { Clocked } from "./deps";

export type AccountRow = {
  id: string;
  email: string;
  name: string | null;
  time_zone: string;
  setup_done_at: string | null;
  created_at: string;
};

export type NamedAccount = { account: Account; firstTag?: SyncedTag };

export function accountById(db: Db, accountId: string): Promise<AccountRow | undefined> {
  return db.one<AccountRow>("SELECT * FROM accounts WHERE id = $1", [accountId]);
}

export function accountByEmail(db: Db, email: string): Promise<AccountRow | undefined> {
  return db.one<AccountRow>("SELECT * FROM accounts WHERE email = $1", [email]);
}

export function toAccount(row: AccountRow): Account {
  return { id: row.id, email: row.email, name: row.name };
}

export function saveName(
  { db, now }: Clocked,
  accountId: string,
  name: string,
): Promise<Result<NamedAccount, "not-found">> {
  return db.tx(async (tx): Promise<Result<NamedAccount, "not-found">> => {
    await tx.run("UPDATE accounts SET name = $1 WHERE id = $2", [name.trim(), accountId]);

    const row = await accountById(tx, accountId);

    if (!row) return err("not-found");

    const firstTag = await addFirstTag({ db: tx, now }, accountId, name.trim());

    return ok({ account: toAccount(row), ...(firstTag && { firstTag }) });
  });
}

export async function finishSetup({ db, now }: Clocked, accountId: string): Promise<void> {
  await db.run("UPDATE accounts SET setup_done_at = $1 WHERE id = $2 AND setup_done_at IS NULL", [
    now().toISOString(),
    accountId,
  ]);
}
