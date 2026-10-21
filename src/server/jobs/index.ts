import "server-only";
import { syncBus } from "../bus";
import { getDb } from "../db/db";
import type { ServiceDeps } from "../services/deps";
import { photoStore } from "../storage";
import { expireNotes } from "./notes";
import { removeDeletedPhotoFiles } from "./photos";
import { createJobTick } from "./schedule";
import { cleanupSignIns } from "./signIns";

const HOUR_MS = 60 * 60 * 1000;

export function startJobs(): void {
  const tick = createJobTick({ hourly: runHourly, daily: [runSignInCleanup, runPhotoCleanup] });

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

async function runSignInCleanup(): Promise<void> {
  await cleanupSignIns(deps());
}

async function runPhotoCleanup(): Promise<void> {
  await removeDeletedPhotoFiles({ ...deps(), store: photoStore() });
}
