import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Db } from "./db";

export type Migration = { version: number; sql: string };

export const MIGRATIONS_DIR = path.join(process.cwd(), "db-migrations");

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

const CREATE_SCHEMA_MIGRATIONS =
  "CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())";

export async function migrate(db: Db, migrations: Migration[]): Promise<void> {
  await db.exec(CREATE_SCHEMA_MIGRATIONS);

  const applied = await appliedVersions(db);

  const pending = migrations.filter((migration) => !applied.has(migration.version));

  for (const migration of pending) {
    await applyMigration(db, migration);
  }
}

async function appliedVersions(db: Db): Promise<Set<number>> {
  const rows = await db.all<{ version: number }>("SELECT version FROM schema_migrations");

  return new Set(rows.map((row) => row.version));
}

async function applyMigration(db: Db, migration: Migration): Promise<void> {
  await db.tx(async (tx) => {
    await tx.exec(migration.sql);
    await tx.run("INSERT INTO schema_migrations (version) VALUES ($1)", [migration.version]);
  });
}
