import "server-only";
import path from "node:path";
import type Database from "better-sqlite3";
import type { Migration } from "./migrate";

export const SQLITE_MIGRATIONS_DIR = path.join(process.cwd(), "db", "sqlite-migrations");

export function migrateSqlite(db: Database.Database, migrations: Migration[]): void {
  const current = db.pragma("user_version", { simple: true }) as number;

  const pending = migrations.filter((migration) => migration.version > current);

  for (const migration of pending) {
    applyMigration(db, migration);
  }
}

function applyMigration(db: Database.Database, migration: Migration): void {
  db.transaction(() => {
    db.exec(migration.sql);
    db.pragma(`user_version = ${migration.version}`);
  })();
}
