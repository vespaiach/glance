import "server-only";
import type { Tone } from "@/domain/schemas";

export type ServerColumns = { updated_at: string; deleted_at: string | null; version: number };

export function serverFields(row: ServerColumns) {
  return {
    updatedAt: row.updated_at,
    version: row.version,
    ...(row.deleted_at === null ? {} : { deletedAt: row.deleted_at }),
  };
}

export function toneFromColumn<T extends Tone>(column: string): T {
  return (/^\d$/.test(column) ? Number(column) : column) as T;
}

export function optional<K extends string>(key: K, value: string | null) {
  return (value === null ? {} : { [key]: value }) as { [P in K]?: string };
}
