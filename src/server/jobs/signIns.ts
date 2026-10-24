import "server-only";
import type { ServiceDeps } from "../services/deps";

const DAY_MS = 24 * 60 * 60 * 1000;

const KEEP_EXPIRED_MS = DAY_MS;

const KEEP_REVOKED_MS = 400 * DAY_MS;

export async function cleanupSignIns({ db, now }: ServiceDeps): Promise<void> {
  const cutoff = before(now(), KEEP_EXPIRED_MS);

  await db.tx(async (tx) => {
    await tx.signInCodes.removeExpired(cutoff);
    await tx.magicLinks.removeExpired(cutoff);
    await tx.sessions.removeRevokedBefore(before(now(), KEEP_REVOKED_MS));
  });
}

function before(now: Date, ms: number): string {
  return new Date(now.getTime() - ms).toISOString();
}
