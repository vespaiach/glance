export const QR_CODE_TTL_MS = 5 * 60 * 1000;

export const QR_OPENS = ["photos"] as const;

export type QrOpens = (typeof QR_OPENS)[number];

const TTL_S = QR_CODE_TTL_MS / 1000;

export function qrSecondsLeft(issuedAt: string, now: Date): number {
  const leftMs = new Date(issuedAt).getTime() + QR_CODE_TTL_MS - now.getTime();

  return Math.min(TTL_S, Math.max(0, Math.ceil(leftMs / 1000)));
}
