import type { Database } from "./database";
import { openMemoryDatabase } from "./memory";
import { postgresDatabase } from "./postgres";
import { migratedSqlPerTest } from "./postgres/testSql";

export function databasePerTest(): () => Database {
  return process.env.TEST_DB === "memory" ? memoryPerTest() : postgresPerTest();
}

function memoryPerTest(): () => Database {
  let db = openMemoryDatabase();

  beforeEach(() => {
    db = openMemoryDatabase();
  });

  return () => db;
}

function postgresPerTest(): () => Database {
  const sql = migratedSqlPerTest();

  return () => postgresDatabase(sql());
}
