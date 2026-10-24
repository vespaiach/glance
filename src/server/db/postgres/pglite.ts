import "server-only";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { driverSql, PG_PARSERS, type Sql } from "./sql";

type PgliteClient = PGlite | Transaction;

export async function openPglite(): Promise<PGlite> {
  return PGlite.create({ extensions: { citext } });
}

export function newPglite(): PGlite {
  return new PGlite({ extensions: { citext } });
}

export function pgliteSql(client: PGlite): Sql {
  return clientSql(client, (fn) => client.transaction((tx) => fn(txSql(tx))));
}

function txSql(tx: Transaction): Sql {
  const db: Sql = clientSql(tx, (fn) => fn(db));

  return db;
}

function clientSql(client: PgliteClient, tx: Sql["tx"]): Sql {
  return driverSql({
    query: async (sql, params) => {
      const result = await client.query(sql, params, { parsers: PG_PARSERS });
      return { rows: result.rows, count: result.affectedRows ?? 0 };
    },
    exec: (sql) => client.exec(sql),
    tx,
  });
}
