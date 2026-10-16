import "server-only";
import { getDb } from "./db/connection";
import { readMigrations } from "./db/migrate";
import { migrateSqlite, SQLITE_MIGRATIONS_DIR } from "./db/sqliteMigrate";
import { startJobs } from "./jobs";

export function bootServer(): void {
  try {
    migrateSqlite(getDb(), readMigrations(SQLITE_MIGRATIONS_DIR));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  startJobs();
}
