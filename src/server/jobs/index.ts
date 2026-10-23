import "server-only";
import { syncBus } from "../bus";
import { database } from "../db";
import { env } from "../env";
import type { ServiceDeps } from "../services/deps";
import { photoStore } from "../storage";
import { createCensusGeocoder } from "../weather/census";
import { GUEST_PHOTO_DIR, seedGuest } from "./guestSeed";
import { expireNotes } from "./notes";
import { removeDeletedPhotoFiles } from "./photos";
import { createJobTick } from "./schedule";
import { cleanupSignIns } from "./signIns";

const HOUR_MS = 60 * 60 * 1000;

export function startJobs(): void {
  const tick = createJobTick({
    hourly: runHourly,
    daily: [runGuestSeed, runSignInCleanup, runPhotoCleanup],
  });

  void tick(new Date());

  setInterval(() => void tick(new Date()), HOUR_MS).unref();
}

function deps(): ServiceDeps {
  return { db: database(), now: () => new Date() };
}

async function runHourly(): Promise<void> {
  const bus = syncBus();

  for (const { accountId, version } of await expireNotes(deps())) bus.publish(accountId, version);
}

async function runGuestSeed(): Promise<void> {
  await seedGuest(
    {
      ...deps(),
      store: photoStore(),
      locator: createCensusGeocoder(fetch),
      photoDir: GUEST_PHOTO_DIR,
    },
    env().GUEST_EMAIL,
  );
}

async function runSignInCleanup(): Promise<void> {
  await cleanupSignIns(deps());
}

async function runPhotoCleanup(): Promise<void> {
  await removeDeletedPhotoFiles({ ...deps(), store: photoStore() });
}
