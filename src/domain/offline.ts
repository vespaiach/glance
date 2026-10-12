export const OFFLINE_PILL_DELAY_MS = 30_000;

export function offlinePillShown(
  offlineSince: Date | undefined,
  now: Date,
  delayMs = OFFLINE_PILL_DELAY_MS,
): boolean {
  if (offlineSince === undefined) return false;

  return now.getTime() - offlineSince.getTime() >= delayMs;
}
