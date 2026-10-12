import "server-only";
import { getDb } from "./db/connection";
import { MIGRATIONS_DIR, migrate, readMigrations } from "./db/migrate";

export function bootServer(): void {
  try {
    migrate(getDb(), readMigrations(MIGRATIONS_DIR));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
