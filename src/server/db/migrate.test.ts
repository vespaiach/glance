import { writeFileSync } from "node:fs";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import type { Db } from "./db";
import { migrate, readMigrations } from "./migrate";
import { openPglite, pgliteDb } from "./pglite";
import { tempDirPerTest } from "./testDir";

const tempDir = tempDirPerTest();

let client: PGlite;

let db: Db;

beforeEach(async () => {
  client = await openPglite();
  db = pgliteDb(client);
});

afterEach(async () => {
  await client.close();
});

async function tableNames(): Promise<string[]> {
  const rows = await db.all<{ name: string }>(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> 'schema_migrations' ORDER BY table_name",
  );

  return rows.map((row) => row.name);
}

async function versions(): Promise<number[]> {
  const rows = await db.all<{ version: number }>(
    "SELECT version FROM schema_migrations ORDER BY version",
  );

  return rows.map((row) => row.version);
}

describe("readMigrations", () => {
  it("D7 reads NNN_*.sql files in number order and ignores other files", () => {
    writeFileSync(path.join(tempDir(), "002_b.sql"), "SELECT 2;");
    writeFileSync(path.join(tempDir(), "001_a.sql"), "SELECT 1;");
    writeFileSync(path.join(tempDir(), "README.md"), "notes");
    writeFileSync(path.join(tempDir(), "3_c.sql"), "SELECT 3;");

    expect(readMigrations(tempDir())).toEqual([
      { version: 1, sql: "SELECT 1;" },
      { version: 2, sql: "SELECT 2;" },
    ]);
  });
});

describe("migrate", () => {
  const first = { version: 1, sql: "CREATE TABLE a (id integer PRIMARY KEY);" };
  const second = { version: 2, sql: "CREATE TABLE b (id integer PRIMARY KEY);" };

  it("D7 applies every migration to a new database and records each version", async () => {
    await migrate(db, [first, second]);

    expect(await tableNames()).toEqual(["a", "b"]);
    expect(await versions()).toEqual([1, 2]);
  });

  it("D7 applies only migrations not recorded yet", async () => {
    await migrate(db, [first]);

    await migrate(db, [first, second]);

    expect(await tableNames()).toEqual(["a", "b"]);
    expect(await versions()).toEqual([1, 2]);
  });

  it("D7 running it again changes nothing", async () => {
    await migrate(db, [first, second]);

    await expect(migrate(db, [first, second])).resolves.toBeUndefined();
    expect(await versions()).toEqual([1, 2]);
  });

  it("D7 a failing migration leaves the database at the last good version", async () => {
    const broken = { version: 2, sql: "CREATE TABLE b (id integer); CREATE TABLE nope (" };

    await expect(migrate(db, [first, broken])).rejects.toThrow();
    expect(await tableNames()).toEqual(["a"]);
    expect(await versions()).toEqual([1]);
  });
});
