import "server-only";
import path from "node:path";
import { syncBus } from "../bus";
import { getDb } from "../db/connection";
import { env } from "../env";
import type { ServiceDeps } from "../services/deps";
import { backupDb } from "./backup";
import { cleanupLinks } from "./links";
import { expireNotes } from "./notes";
import { createJobTick } from "./schedule";

const HOUR_MS = 60 * 60 * 1000;

export function startJobs(): void {
  const tick = createJobTick({ hourly: runHourly, daily: runDaily });

  tick(new Date());

  setInterval(() => tick(new Date()), HOUR_MS).unref();
}

function deps(): ServiceDeps {
  return { db: getDb(), now: () => new Date() };
}

function runHourly(): void {
  const bus = syncBus();

  for (const { accountId, version } of expireNotes(deps())) bus.publish(accountId, version);
}

function runDaily(): void {
  cleanupLinks(deps());

  backupDb({ ...deps(), backupDir: path.join(env().DATA_DIR, "backups") });
}
