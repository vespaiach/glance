import { existsSync } from "node:fs";
import path from "node:path";
import { openDataDb, openDb } from "./connection";
import { tempDirPerTest } from "./testDir";

const tempDir = tempDirPerTest();

describe("openDb", () => {
  it("D7 opens the file in WAL mode", () => {
    const db = openDb(path.join(tempDir(), "a.db"));

    expect(db.pragma("journal_mode", { simple: true })).toBe("wal");

    db.close();
  });

  it("D7 turns foreign keys on", () => {
    const db = openDb(path.join(tempDir(), "a.db"));

    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);

    db.close();
  });
});

describe("openDataDb", () => {
  it("tech§6.5 creates DATA_DIR and opens glance.db inside it", () => {
    const dataDir = path.join(tempDir(), "data");

    const db = openDataDb(dataDir);

    expect(db.name).toBe(path.join(dataDir, "glance.db"));
    expect(existsSync(db.name)).toBe(true);

    db.close();
  });
});
