import "server-only";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { type Db, driverDb, PG_PARSERS } from "./db";

type PgliteClient = PGlite | Transaction;

export async function openPglite(): Promise<PGlite> {
  return PGlite.create({ extensions: { citext } });
}

export function pgliteDb(client: PGlite): Db {
  return clientDb(client, (fn) => client.transaction((tx) => fn(txDb(tx))));
}

function txDb(tx: Transaction): Db {
  const db: Db = clientDb(tx, (fn) => fn(db));

  return db;
}

function clientDb(client: PgliteClient, tx: Db["tx"]): Db {
  return driverDb({
    query: async (sql, params) => {
      const result = await client.query(sql, params, { parsers: PG_PARSERS });
      return { rows: result.rows, count: result.affectedRows ?? 0 };
    },
    exec: (sql) => client.exec(sql),
    tx,
  });
}
