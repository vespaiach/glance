import "server-only";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import type { ServiceDeps } from "../services/deps";

export type BackupDeps = ServiceDeps & { backupDir: string };

const KEEP = 7;

const BACKUP_FILE = /^glance-\d{4}-\d{2}-\d{2}\.db$/;

export function backupDb({ db, now, backupDir }: BackupDeps): void {
  const file = path.join(backupDir, `glance-${now().toISOString().slice(0, 10)}.db`);

  mkdirSync(backupDir, { recursive: true });

  if (!existsSync(file)) db.prepare("VACUUM INTO ?").run(file);

  pruneBackups(backupDir);
}

function pruneBackups(backupDir: string): void {
  const stale = readdirSync(backupDir)
    .filter((name) => BACKUP_FILE.test(name))
    .sort()
    .slice(0, -KEEP);

  for (const name of stale) rmSync(path.join(backupDir, name));
}
