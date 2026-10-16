import "server-only";
import type { Db } from "../db/db";

export type ServiceDeps = { db: Db; now: () => Date };
