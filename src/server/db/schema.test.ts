import path from "node:path";
import type Database from "better-sqlite3";
import { openDb } from "./connection";
import { MIGRATIONS_DIR, migrate, readMigrations } from "./migrate";
import { tempDirPerTest } from "./testDir";

const tempDir = tempDirPerTest();

const NOW = "2026-10-09T14:00:00.000Z";

function migratedDb(): Database.Database {
  const db = openDb(path.join(tempDir(), "glance.db"));

  migrate(db, readMigrations(MIGRATIONS_DIR));

  return db;
}

function insertAccount(db: Database.Database, id: string): void {
  db.prepare(
    "INSERT INTO accounts (id, email, time_zone, created_at) VALUES (?, ?, 'America/New_York', ?)",
  ).run(id, `${id}@example.com`, NOW);
}

function insertEvent(db: Database.Database, startAt: string, endAt: string | null): void {
  db.prepare(
    "INSERT INTO events (id, account_id, title, start_at, end_at, updated_at, version) VALUES ('e1', 'a1', 'Swim', ?, ?, ?, 1)",
  ).run(startAt, endAt, NOW);
}

describe("001_init", () => {
  it("spec§7.0 creates every v1 table", () => {
    const db = migratedDb();

    const names = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name);

    expect(names).toEqual([
      "accounts",
      "displays",
      "events",
      "magic_links",
      "notes",
      "photos",
      "sessions",
      "settings",
      "sync_state",
      "weather_cache",
    ]);

    db.close();
  });

  it("spec§7.0 starts the global change counter at 0", () => {
    const db = migratedDb();

    expect(db.prepare("SELECT id, version FROM sync_state").all()).toEqual([{ id: 1, version: 0 }]);

    db.close();
  });

  it("spec§7.0 allows only one sync_state row", () => {
    const db = migratedDb();

    expect(() => db.prepare("INSERT INTO sync_state VALUES (2, 0)").run()).toThrow(/CHECK/);

    db.close();
  });

  it("spec§7.0 rejects an event that ends at or before it starts", () => {
    const db = migratedDb();
    insertAccount(db, "a1");

    expect(() => insertEvent(db, NOW, NOW)).toThrow(/CHECK/);
    expect(() => insertEvent(db, NOW, null)).not.toThrow();

    db.close();
  });

  it("spec§7.0 rejects a row whose account doesn't exist", () => {
    const db = migratedDb();

    expect(() => insertEvent(db, NOW, null)).toThrow(/FOREIGN KEY/);

    db.close();
  });

  it("spec§7.0 matches account emails without case", () => {
    const db = migratedDb();
    insertAccount(db, "a1");

    const found = db.prepare("SELECT id FROM accounts WHERE email = ?").get("A1@Example.com");

    expect(found).toEqual({ id: "a1" });

    db.close();
  });

  it("spec§7.0 defaults a note's author to Guest", () => {
    const db = migratedDb();
    insertAccount(db, "a1");

    db.prepare(
      "INSERT INTO notes (id, account_id, text, tone, rotation, created_at, updated_at, version) VALUES ('n1', 'a1', 'Hi', 'yellow', 1.5, ?, ?, 1)",
    ).run(NOW, NOW);

    expect(db.prepare("SELECT author FROM notes").get()).toEqual({ author: "Guest" });

    db.close();
  });
});

describe("002_setup_done", () => {
  it("SIGNIN-14 fills setup_done_at from created_at for accounts made before it", () => {
    const db = openDb(path.join(tempDir(), "glance.db"));
    const [init, setupDone] = readMigrations(MIGRATIONS_DIR);
    migrate(db, init ? [init] : []);
    insertAccount(db, "a1");

    migrate(db, setupDone ? [setupDone] : []);

    expect(db.prepare("SELECT setup_done_at FROM accounts").get()).toEqual({ setup_done_at: NOW });

    db.close();
  });

  it("SIGNIN-14 leaves setup_done_at empty for a new account", () => {
    const db = migratedDb();
    insertAccount(db, "a1");

    expect(db.prepare("SELECT setup_done_at FROM accounts").get()).toEqual({ setup_done_at: null });

    db.close();
  });
});
