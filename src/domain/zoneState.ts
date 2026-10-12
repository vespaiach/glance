export type ZoneState<T> =
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "empty" }
  | { kind: "ready"; data: readonly T[]; updatedAt?: string };

export interface ZoneInput<T> {
  rows: readonly T[];
  everSynced: boolean;
  failed: boolean;
  lastSyncedAt?: string;
  since: Date;
  now: Date;
}

export const LOADING_LIMIT_MS = 10_000;

function savedState<T>({ rows, failed, lastSyncedAt }: ZoneInput<T>): ZoneState<T> {
  if (rows.length === 0) return { kind: "empty" };

  return failed && lastSyncedAt !== undefined
    ? { kind: "ready", data: rows, updatedAt: lastSyncedAt }
    : { kind: "ready", data: rows };
}

export function zoneState<T>(input: ZoneInput<T>): ZoneState<T> {
  if (input.everSynced || input.rows.length > 0) return savedState(input);

  const timedOut = input.now.getTime() - input.since.getTime() >= LOADING_LIMIT_MS;

  return input.failed || timedOut ? { kind: "failed" } : { kind: "loading" };
}
