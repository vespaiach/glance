import "server-only";
import { syncBus } from "../bus";
import { database } from "../db";
import { env } from "../env";
import { logError } from "../log";
import { createWebPush } from "../push";
import type { ServiceDeps } from "../services/deps";
import { photoStore } from "../storage";
import { removeStagedImports } from "./imports";
import { expireNotes } from "./notes";
import { backfillPhotoBytes, removeDeletedPhotoFiles, removePhotoOriginals } from "./photos";
import { cleanupReminderSends, sendReminderPushes } from "./reminders";
import { createJobTick } from "./schedule";
import { cleanupSignIns } from "./signIns";

const MINUTE_MS = 60 * 1000;

const HOUR_MS = 60 * MINUTE_MS;

export function startJobs(): void {
  const tick = createJobTick({
    hourly: { expireNotes: runHourly, removeStagedImports: runStagedImportCleanup },
    daily: {
      cleanupSignIns: runSignInCleanup,
      removeDeletedPhotoFiles: runPhotoCleanup,
      cleanupReminderSends: runReminderSendCleanup,
    },
  });

  void tick(new Date());

  void runOriginalCleanup();

  void runPhotoBytesBackfill();

  setInterval(() => void tick(new Date()), HOUR_MS).unref();

  startReminderPushes();
}

function startReminderPushes(): void {
  const config = env().push;

  if (config === undefined) return;

  const push = createWebPush(config);

  const run = () =>
    void sendReminderPushes({ ...deps(), push }).catch(jobFailed("sendReminderPushes"));

  setInterval(run, MINUTE_MS).unref();
}

function deps(): ServiceDeps {
  return { db: database(), now: () => new Date() };
}

async function runHourly(): Promise<void> {
  const bus = syncBus();

  for (const { accountId, version } of await expireNotes(deps())) bus.publish(accountId, version);
}

async function runStagedImportCleanup(): Promise<void> {
  await removeStagedImports(deps());
}

async function runSignInCleanup(): Promise<void> {
  await cleanupSignIns(deps());
}

async function runPhotoCleanup(): Promise<void> {
  await removeDeletedPhotoFiles({ ...deps(), store: photoStore() });
}

async function runReminderSendCleanup(): Promise<void> {
  await cleanupReminderSends(deps());
}

async function runOriginalCleanup(): Promise<void> {
  await removePhotoOriginals({ ...deps(), store: photoStore() }).catch(
    jobFailed("removePhotoOriginals"),
  );
}

async function runPhotoBytesBackfill(): Promise<void> {
  await backfillPhotoBytes({ ...deps(), store: photoStore() }).catch(
    jobFailed("backfillPhotoBytes"),
  );
}

function jobFailed(job: string): (error: unknown) => void {
  return (error) => logError("job", "job-failed", error, { job });
}
