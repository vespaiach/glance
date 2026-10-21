import "server-only";
import type { ServiceDeps } from "../services/deps";

const KEEP_EXPIRED_MS = 24 * 60 * 60 * 1000;

export async function cleanupSignIns({ db, now }: ServiceDeps): Promise<void> {
  const cutoff = new Date(now().getTime() - KEEP_EXPIRED_MS).toISOString();

  await db.tx(async (tx) => {
    await tx.signInCodes.removeExpired(cutoff);
    await tx.magicLinks.removeExpired(cutoff);
  });
}
