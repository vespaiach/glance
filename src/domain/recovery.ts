const DAY_MS = 24 * 60 * 60_000;

const CRASH_WINDOW_MS = 10 * 60_000;

export function reloadDue(loadedAt: Date, now: Date): boolean {
  return now.getTime() - loadedAt.getTime() >= DAY_MS;
}

export function recentCrashes(crashes: readonly string[], now: Date): string[] {
  return crashes.filter((at) => now.getTime() - Date.parse(at) < CRASH_WINDOW_MS);
}
