const RETRY_MINUTES = [1, 2, 5] as const;

const MINUTE_MS = 60_000;

export function retryDelayMs(failures: number): number {
  const minutes = RETRY_MINUTES[Math.min(failures, RETRY_MINUTES.length) - 1] ?? 1;

  return minutes * MINUTE_MS;
}
