import "server-only";
import type Database from "better-sqlite3";
import { err, ok, type Result } from "@/domain/result";
import type { Account } from "@/domain/schemas";
import type { Clocked } from "./deps";

export type AccountRow = {
  id: string;
  email: string;
  name: string | null;
  time_zone: string;
  setup_done_at: string | null;
  created_at: string;
};

export function accountById(db: Database.Database, accountId: string): AccountRow | undefined {
  return db.prepare("SELECT * FROM accounts WHERE id = ?").get(accountId) as AccountRow | undefined;
}

export function accountByEmail(db: Database.Database, email: string): AccountRow | undefined {
  return db.prepare("SELECT * FROM accounts WHERE email = ?").get(email) as AccountRow | undefined;
}

export function toAccount(row: AccountRow): Account {
  return { id: row.id, email: row.email, name: row.name };
}

export function saveName(
  db: Database.Database,
  accountId: string,
  name: string,
): Result<Account, "not-found"> {
  db.prepare("UPDATE accounts SET name = ? WHERE id = ?").run(name.trim(), accountId);

  const row = accountById(db, accountId);

  return row ? ok(toAccount(row)) : err("not-found");
}

export function finishSetup({ db, now }: Clocked, accountId: string): void {
  db.prepare("UPDATE accounts SET setup_done_at = ? WHERE id = ? AND setup_done_at IS NULL").run(
    now().toISOString(),
    accountId,
  );
}
