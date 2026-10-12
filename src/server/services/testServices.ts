import type Database from "better-sqlite3";
import { migratedDbPerTest } from "../db/testDb";
import type { ServiceDeps } from "./deps";

export const START = new Date("2026-10-09T14:00:00.000Z");

export const MARIA = "0192f3a0-0000-7000-8000-000000000001";

export const OMAR = "0192f3a0-0000-7000-8000-000000000002";

export type ServiceHarness = {
  deps: () => ServiceDeps;
  advance: (ms: number) => void;
  globalVersion: () => number;
};

export function serviceHarnessPerTest(): ServiceHarness {
  const db = migratedDbPerTest();

  let clock = START;

  let deps: ServiceDeps | undefined;

  beforeEach(() => {
    clock = START;
    deps = undefined;
  });

  return {
    deps: () => {
      deps ??= { db: withAccounts(db()), now: () => clock };

      return deps;
    },
    advance: (ms) => {
      clock = new Date(clock.getTime() + ms);
    },
    globalVersion: () =>
      (db().prepare("SELECT version FROM sync_state").get() as { version: number }).version,
  };
}

function withAccounts(db: Database.Database): Database.Database {
  const insert = db.prepare(
    "INSERT INTO accounts (id, email, time_zone, created_at) VALUES (?, ?, 'America/New_York', ?)",
  );

  insert.run(MARIA, "maria@example.com", START.toISOString());
  insert.run(OMAR, "omar@example.com", START.toISOString());

  return db;
}
