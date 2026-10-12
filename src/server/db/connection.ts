import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { env } from "../env";

const DB_FILE = "glance.db";

const shared = globalThis as typeof globalThis & { glanceDb?: Database.Database };

export function openDb(file: string): Database.Database {
  const db = new Database(file);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  return db;
}

export function openDataDb(dataDir: string): Database.Database {
  mkdirSync(dataDir, { recursive: true });

  return openDb(path.join(dataDir, DB_FILE));
}

export function getDb(): Database.Database {
  shared.glanceDb ??= openDataDb(env().DATA_DIR);

  return shared.glanceDb;
}
