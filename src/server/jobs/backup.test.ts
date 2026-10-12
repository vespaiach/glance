import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { openDb } from "../db/connection";
import { tempDirPerTest } from "../db/testDir";
import { MARIA, serviceHarnessPerTest } from "../services/testServices";
import { backupDb } from "./backup";

const harness = serviceHarnessPerTest();

const backupsRoot = tempDirPerTest();

function backupDir(): string {
  return path.join(backupsRoot(), "backups");
}

function backups(): string[] {
  return readdirSync(backupDir()).sort();
}

function seedFiles(names: string[]): void {
  mkdirSync(backupDir(), { recursive: true });

  for (const name of names) writeFileSync(path.join(backupDir(), name), "");
}

function runBackup(): void {
  backupDb({ ...harness.deps(), backupDir: backupDir() });
}

describe("backupDb", () => {
  it("tech§6.4 writes a copy of the database named for the UTC day", () => {
    runBackup();

    const copy = openDb(path.join(backupDir(), "glance-2026-10-09.db"));

    expect(copy.prepare("SELECT id FROM accounts WHERE id = ?").get(MARIA)).toEqual({ id: MARIA });

    copy.close();
  });

  it("tech§6.4 keeps the seven newest backups", () => {
    seedFiles([1, 2, 3, 4, 5, 6, 7].map((day) => `glance-2026-10-0${day}.db`));

    runBackup();

    expect(backups()).toEqual([
      "glance-2026-10-02.db",
      "glance-2026-10-03.db",
      "glance-2026-10-04.db",
      "glance-2026-10-05.db",
      "glance-2026-10-06.db",
      "glance-2026-10-07.db",
      "glance-2026-10-09.db",
    ]);
  });

  it("tech§6.4 keeps a backup already made today instead of failing", () => {
    seedFiles(["glance-2026-10-09.db"]);

    runBackup();

    expect(backups()).toEqual(["glance-2026-10-09.db"]);
  });

  it("tech§6.4 never prunes files that aren't its backups", () => {
    seedFiles([...[1, 2, 3, 4, 5, 6, 7, 8].map((day) => `glance-2026-10-0${day}.db`), "notes.txt"]);

    runBackup();

    expect(backups()).toContain("notes.txt");
    expect(backups()).toHaveLength(8);
  });
});
