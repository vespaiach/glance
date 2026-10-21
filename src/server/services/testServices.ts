import type { AccountRecord, Database } from "../db";
import { databasePerTest } from "../db/testDb";
import type { ServiceDeps } from "./deps";

export const START = new Date("2026-10-09T14:00:00.000Z");

export const MARIA = "0192f3a0-0000-7000-8000-000000000001";

export const OMAR = "0192f3a0-0000-7000-8000-000000000002";

export type ServiceHarness = {
  deps: () => ServiceDeps;
  advance: (ms: number) => void;
  globalVersion: () => Promise<number>;
};

export function serviceHarnessPerTest(): ServiceHarness {
  const db = databasePerTest();

  let clock = START;

  beforeEach(async () => {
    clock = START;
    await addAccounts(db());
  });

  return {
    deps: () => ({ db: db(), now: () => clock }),
    advance: (ms) => {
      clock = new Date(clock.getTime() + ms);
    },
    globalVersion: () => db().versions.current(),
  };
}

export function newAccount(id: string, email: string): AccountRecord {
  return {
    id,
    email,
    name: null,
    timeZone: "America/New_York",
    setupDoneAt: null,
    createdAt: START.toISOString(),
  };
}

async function addAccounts(db: Database): Promise<void> {
  await db.accounts.insert(newAccount(MARIA, "maria@example.com"));
  await db.accounts.insert(newAccount(OMAR, "omar@example.com"));
}
