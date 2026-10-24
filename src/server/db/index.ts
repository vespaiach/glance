import "server-only";
import { env } from "../env";
import type { Database, DatabaseConfig, OpenedDatabase } from "./database";
import { openPgliteDatabase, openPostgresDatabase } from "./postgres";

export type * from "./database";

const shared = globalThis as typeof globalThis & { glanceDatabase?: OpenedDatabase };

export function createDatabase(config: DatabaseConfig): OpenedDatabase {
  switch (config.kind) {
    case "postgres":
      return openPostgresDatabase(config.url);
    case "memory":
      return openPgliteDatabase();
  }
}

export function database(): Database {
  return opened().db;
}

export function prepareDatabase(): Promise<void> {
  return opened().prepare();
}

function opened(): OpenedDatabase {
  shared.glanceDatabase ??= createDatabase(env().database);

  return shared.glanceDatabase;
}
