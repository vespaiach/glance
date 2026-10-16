import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import type Database from "better-sqlite3";
import { openDb } from "./connection";
import type { Db } from "./db";
import { MIGRATIONS_DIR, migrate, readMigrations } from "./migrate";
import { openPglite, pgliteDb } from "./pglite";
import { migrateSqlite, SQLITE_MIGRATIONS_DIR } from "./sqliteMigrate";
import { tempDirPerTest } from "./testDir";

export function migratedDbPerTest(): () => Db {
  let template: Promise<PGlite> | undefined;

  let client: PGlite | undefined;

  beforeEach(async () => {
    template ??= migratedPglite();
    client = (await (await template).clone()) as PGlite;
  });

  afterEach(async () => {
    await client?.close();
    client = undefined;
  });

  afterAll(async () => {
    await (await template)?.close();
  });

  return () => pgliteDb(client as PGlite);
}

async function migratedPglite(): Promise<PGlite> {
  const client = await openPglite();

  await migrate(pgliteDb(client), readMigrations(MIGRATIONS_DIR));

  return client;
}

export function sqliteDbPerTest(): () => Database.Database {
  const tempDir = tempDirPerTest();

  let db: Database.Database | undefined;

  afterEach(() => {
    db?.close();
    db = undefined;
  });

  return () => {
    db ??= openDb(path.join(tempDir(), "glance.db"));

    migrateSqlite(db, readMigrations(SQLITE_MIGRATIONS_DIR));

    return db;
  };
}
