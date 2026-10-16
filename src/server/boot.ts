import "server-only";
import { getDb } from "./db/db";
import { MIGRATIONS_DIR, migrate, readMigrations } from "./db/migrate";
import { startJobs } from "./jobs";

export async function bootServer(): Promise<void> {
  try {
    await migrate(getDb(), readMigrations(MIGRATIONS_DIR));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  startJobs();
}
