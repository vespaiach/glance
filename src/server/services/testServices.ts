import type { Db } from "../db/db";
import { migratedDbPerTest } from "../db/testDb";
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
  const db = migratedDbPerTest();

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
    globalVersion: async () =>
      (
        (await db().one<{ version: number }>("SELECT version FROM sync_state")) as {
          version: number;
        }
      ).version,
  };
}

async function addAccounts(db: Db): Promise<void> {
  const insert =
    "INSERT INTO accounts (id, email, time_zone, created_at) VALUES ($1, $2, 'America/New_York', $3)";

  await db.run(insert, [MARIA, "maria@example.com", START.toISOString()]);
  await db.run(insert, [OMAR, "omar@example.com", START.toISOString()]);
}
