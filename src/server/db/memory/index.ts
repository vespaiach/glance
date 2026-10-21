import "server-only";
import type { Database } from "../database";

export function openMemoryDatabase(): Database {
  return {} as Database;
}
