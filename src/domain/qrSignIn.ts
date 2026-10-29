export const QR_CODE_TTL_MS = 3 * 60 * 1000;

export const IMPORT_CODE_TTL_MS = 10 * 60 * 1000;

export const QR_OPENS = ["photos", "import"] as const;

export type QrOpens = (typeof QR_OPENS)[number];

const VERIFY_PATH = "/api/auth/verify";

export function qrTtlMs(opens?: QrOpens): number {
  return opens === "import" ? IMPORT_CODE_TTL_MS : QR_CODE_TTL_MS;
}

export function qrSecondsLeft(issuedAt: string, now: Date, opens?: QrOpens): number {
  const ttlMs = qrTtlMs(opens);

  const leftMs = new Date(issuedAt).getTime() + ttlMs - now.getTime();

  return Math.min(ttlMs / 1000, Math.max(0, Math.ceil(leftMs / 1000)));
}

export function linkToken(text: string, origin: string): string | undefined {
  const url = parseUrl(text);

  if (url?.origin !== origin || url.pathname !== VERIFY_PATH) return undefined;

  return url.searchParams.get("t") || undefined;
}

function parseUrl(text: string): URL | undefined {
  try {
    return new URL(text);
  } catch {
    return undefined;
  }
}
