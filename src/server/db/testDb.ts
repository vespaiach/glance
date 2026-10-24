import type { Database } from "./database";
import { postgresDatabase } from "./postgres";
import { migratedSqlPerTest } from "./postgres/testSql";

export function databasePerTest(): () => Database {
  const sql = migratedSqlPerTest();

  return () => postgresDatabase(sql());
}
