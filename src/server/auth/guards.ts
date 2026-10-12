import "server-only";

export function isAllowedOrigin(origin: string | null, appUrl: string): boolean {
  return origin === new URL(appUrl).origin;
}

export function clientIp(forwardedFor: string | null): string {
  const last = forwardedFor?.split(",").at(-1)?.trim();

  return last || "unknown";
}
