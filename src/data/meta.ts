import Dexie, { type EntityTable } from "dexie";
import type { Account } from "@/domain/schemas";

export type SignedInAccount = {
  accountId: Account["id"];
  name: Account["name"];
  email: Account["email"];
};

export type MetaDb = Dexie & { account: EntityTable<SignedInAccount, "accountId"> };

const META_DB_NAME = "glance-meta";

export function openMetaDb(): MetaDb {
  const db = new Dexie(META_DB_NAME) as MetaDb;

  db.version(1).stores({ account: "accountId" });

  return db;
}

export function deleteMetaDb(): Promise<void> {
  return Dexie.delete(META_DB_NAME);
}

export function readSignedInAccount(db: MetaDb): Promise<SignedInAccount | undefined> {
  return db.account.toCollection().first();
}

export function saveSignedInAccount(db: MetaDb, account: SignedInAccount): Promise<void> {
  return db.transaction("rw", db.account, async () => {
    await db.account.clear();

    await db.account.put(account);
  });
}

export function clearSignedInAccount(db: MetaDb): Promise<void> {
  return db.account.clear();
}
