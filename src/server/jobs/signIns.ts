import "server-only";
import type { ServiceDeps } from "../services/deps";

const KEEP_EXPIRED_MS = 24 * 60 * 60 * 1000;

export async function cleanupSignIns({ db, now }: ServiceDeps): Promise<void> {
  const cutoff = new Date(now().getTime() - KEEP_EXPIRED_MS).toISOString();

  await db.tx(async (tx) => {
    await tx.run("DELETE FROM sign_in_codes WHERE expires_at < $1", [cutoff]);
    await tx.run("DELETE FROM magic_links WHERE expires_at < $1", [cutoff]);
  });
}
