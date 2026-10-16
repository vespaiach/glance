import "server-only";
import path from "node:path";
import { syncBus } from "../bus";
import { getDb } from "../db/db";
import { env } from "../env";
import type { ServiceDeps } from "../services/deps";
import { cleanupLinks } from "./links";
import { expireNotes } from "./notes";
import { removeDeletedPhotoFiles } from "./photos";
import { createJobTick } from "./schedule";

const HOUR_MS = 60 * 60 * 1000;

export function startJobs(): void {
  const tick = createJobTick({ hourly: runHourly, daily: runDaily });

  void tick(new Date());

  setInterval(() => void tick(new Date()), HOUR_MS).unref();
}

function deps(): ServiceDeps {
  return { db: getDb(), now: () => new Date() };
}

async function runHourly(): Promise<void> {
  const bus = syncBus();

  for (const { accountId, version } of await expireNotes(deps())) bus.publish(accountId, version);
}

async function runDaily(): Promise<void> {
  await cleanupLinks(deps());

  await removeDeletedPhotoFiles({ ...deps(), photosDir: path.join(env().DATA_DIR, "photos") });
}
