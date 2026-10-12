import { writeFileSync } from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { openDb } from "./connection";
import { migrate, readMigrations } from "./migrate";
import { tempDirPerTest } from "./testDir";

const tempDir = tempDirPerTest();

function tableNames(db: Database.Database): string[] {
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all();

  return rows.map((row) => (row as { name: string }).name);
}

function userVersion(db: Database.Database): number {
  return db.pragma("user_version", { simple: true }) as number;
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
  const first = { version: 1, sql: "CREATE TABLE a (id INTEGER PRIMARY KEY);" };
  const second = { version: 2, sql: "CREATE TABLE b (id INTEGER PRIMARY KEY);" };

  it("D7 applies every migration to a new database and sets user_version", () => {
    const db = openDb(path.join(tempDir(), "a.db"));

    migrate(db, [first, second]);

    expect(tableNames(db)).toEqual(["a", "b"]);
    expect(userVersion(db)).toBe(2);

    db.close();
  });

  it("D7 applies only migrations newer than user_version", () => {
    const db = openDb(path.join(tempDir(), "a.db"));
    migrate(db, [first]);

    migrate(db, [first, second]);

    expect(tableNames(db)).toEqual(["a", "b"]);
    expect(userVersion(db)).toBe(2);

    db.close();
  });

  it("D7 running it again changes nothing", () => {
    const db = openDb(path.join(tempDir(), "a.db"));
    migrate(db, [first, second]);

    expect(() => migrate(db, [first, second])).not.toThrow();
    expect(userVersion(db)).toBe(2);

    db.close();
  });

  it("D7 a failing migration leaves the database at the last good version", () => {
    const db = openDb(path.join(tempDir(), "a.db"));
    const broken = { version: 2, sql: "CREATE TABLE b (id INTEGER); CREATE TABLE nope (" };

    expect(() => migrate(db, [first, broken])).toThrow();
    expect(tableNames(db)).toEqual(["a"]);
    expect(userVersion(db)).toBe(1);

    db.close();
  });
});
