import "server-only";
import type { ServiceDeps } from "../services/deps";

const KEEP_EXPIRED_MS = 24 * 60 * 60 * 1000;

export function cleanupLinks({ db, now }: ServiceDeps): Promise<number> {
  const cutoff = new Date(now().getTime() - KEEP_EXPIRED_MS).toISOString();

  return db.run("DELETE FROM magic_links WHERE expires_at < $1", [cutoff]);
}
