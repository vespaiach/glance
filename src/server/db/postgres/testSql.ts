import type { PGlite } from "@electric-sql/pglite";
import { MIGRATIONS_DIR, migrate, readMigrations } from "./migrate";
import { openPglite, pgliteSql } from "./pglite";
import type { Sql } from "./sql";

export function migratedSqlPerTest(): () => Sql {
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

  return () => pgliteSql(client as PGlite);
}

async function migratedPglite(): Promise<PGlite> {
  const client = await openPglite();

  await migrate(pgliteSql(client), readMigrations(MIGRATIONS_DIR));

  return client;
}
