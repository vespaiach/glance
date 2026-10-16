import type { PGlite } from "@electric-sql/pglite";
import type { Db } from "./db";
import { MIGRATIONS_DIR, migrate, readMigrations } from "./migrate";
import { openPglite, pgliteDb } from "./pglite";

export function migratedDbPerTest(): () => Db {
  let template: Promise<PGlite> | undefined;

  let client: PGlite | undefined;

  beforeEach(async () => {
    template ??= migratedPglite();
    client = (await (await template).clone()) as PGlite;
  });

  afterEach(async () => {
    await client?.close();
    client = undefined;
  });

  afterAll(async () => {
    await (await template)?.close();
  });

  return () => pgliteDb(client as PGlite);
}

async function migratedPglite(): Promise<PGlite> {
  const client = await openPglite();

  await migrate(pgliteDb(client), readMigrations(MIGRATIONS_DIR));

  return client;
}
