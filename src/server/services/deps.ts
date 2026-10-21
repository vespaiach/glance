import "server-only";
import type { Database } from "../db";

export type ServiceDeps = { db: Database; now: () => Date };
