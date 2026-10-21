import "server-only";
import type { Database, OpenedDatabase, Repos } from "../database";
import { accountsRepo, displaysRepo, magicLinksRepo, sessionsRepo, signInCodesRepo } from "./auth";
import { eventsRepo } from "./events";
import { MIGRATIONS_DIR, migrate, readMigrations } from "./migrate";
import { notesRepo } from "./notes";
import { photosRepo } from "./photos";
import { settingsRepo, weatherCacheRepo } from "./settings";
import { openPgSql, type Sql } from "./sql";
import { tagsRepo } from "./tags";

const LOCK_VERSIONS = "SELECT version FROM sync_state WHERE id = 1 FOR UPDATE";

export function openPostgresDatabase(url: string): OpenedDatabase {
  const sql = openPgSql(url);

  return {
    db: postgresDatabase(sql),
    prepare: () => migrate(sql, readMigrations(MIGRATIONS_DIR)),
  };
}

export function postgresDatabase(sql: Sql): Database {
  return {
    ...repos(sql),
    tx: (fn) =>
      sql.tx(async (tx) => {
        await tx.run(LOCK_VERSIONS);

        return fn(joined(tx));
      }),
  };
}

function joined(sql: Sql): Database {
  const db: Database = { ...repos(sql), tx: (fn) => fn(db) };

  return db;
}

function repos(sql: Sql): Repos {
  return {
    versions: versionsRepo(sql),
    accounts: accountsRepo(sql),
    displays: displaysRepo(sql),
    sessions: sessionsRepo(sql),
    signInCodes: signInCodesRepo(sql),
    magicLinks: magicLinksRepo(sql),
    events: eventsRepo(sql),
    notes: notesRepo(sql),
    tags: tagsRepo(sql),
    photos: photosRepo(sql),
    settings: settingsRepo(sql),
    weatherCache: weatherCacheRepo(sql),
  };
}

function versionsRepo(sql: Sql): Repos["versions"] {
  return {
    current: async () =>
      (await sql.one<{ version: number }>("SELECT version FROM sync_state WHERE id = 1"))
        ?.version ?? 0,
    next: async () =>
      (
        await sql.one<{ version: number }>(
          "UPDATE sync_state SET version = version + 1 WHERE id = 1 RETURNING version",
        )
      )?.version ?? 0,
  };
}
