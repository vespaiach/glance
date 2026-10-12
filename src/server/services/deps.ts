import "server-only";
import type Database from "better-sqlite3";

export type ServiceDeps = { db: Database.Database; now: () => Date };
