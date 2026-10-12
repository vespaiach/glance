import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

export type Migration = { version: number; sql: string };

export const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

const MIGRATION_FILE = /^(\d{3})_.+\.sql$/;

export function readMigrations(dir: string): Migration[] {
  const files = readdirSync(dir).filter((file) => MIGRATION_FILE.test(file));

  return files
    .map((file) => ({
      version: Number(file.slice(0, 3)),
      sql: readFileSync(path.join(dir, file), "utf8"),
    }))
    .sort((a, b) => a.version - b.version);
}

export function migrate(db: Database.Database, migrations: Migration[]): void {
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
