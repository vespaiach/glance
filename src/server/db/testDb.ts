import path from "node:path";
import type Database from "better-sqlite3";
import { openDb } from "./connection";
import { MIGRATIONS_DIR, migrate, readMigrations } from "./migrate";
import { tempDirPerTest } from "./testDir";

export function migratedDbPerTest(): () => Database.Database {
  const tempDir = tempDirPerTest();

  let db: Database.Database | undefined;

  afterEach(() => {
    db?.close();
    db = undefined;
  });

  return () => {
    db ??= openDb(path.join(tempDir(), "glance.db"));

    migrate(db, readMigrations(MIGRATIONS_DIR));

    return db;
  };
}
