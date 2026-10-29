import "server-only";
import type { ServiceDeps } from "../services/deps";
import { STAGED_MS } from "../services/imports/stage";

export async function removeStagedImports({ db, now }: ServiceDeps): Promise<void> {
  await db.imports.removeStagedBefore(new Date(now().getTime() - STAGED_MS).toISOString());
}
