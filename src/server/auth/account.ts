import "server-only";
import { err, ok, type Result } from "@/domain/result";
import type { Account } from "@/domain/schemas";
import type { Db } from "../db/db";
import type { Clocked } from "./deps";

export type AccountRow = {
  id: string;
  email: string;
  name: string | null;
  time_zone: string;
  setup_done_at: string | null;
  created_at: string;
};

export function accountById(db: Db, accountId: string): Promise<AccountRow | undefined> {
  return db.one<AccountRow>("SELECT * FROM accounts WHERE id = $1", [accountId]);
}

export function accountByEmail(db: Db, email: string): Promise<AccountRow | undefined> {
  return db.one<AccountRow>("SELECT * FROM accounts WHERE email = $1", [email]);
}

export function toAccount(row: AccountRow): Account {
  return { id: row.id, email: row.email, name: row.name };
}

export async function saveName(
  db: Db,
  accountId: string,
  name: string,
): Promise<Result<Account, "not-found">> {
  await db.run("UPDATE accounts SET name = $1 WHERE id = $2", [name.trim(), accountId]);

  const row = await accountById(db, accountId);

  return row ? ok(toAccount(row)) : err("not-found");
}

export async function finishSetup({ db, now }: Clocked, accountId: string): Promise<void> {
  await db.run("UPDATE accounts SET setup_done_at = $1 WHERE id = $2 AND setup_done_at IS NULL", [
    now().toISOString(),
    accountId,
  ]);
}
