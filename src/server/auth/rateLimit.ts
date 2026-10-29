import "server-only";

export type RateLimiter = {
  allow(key: string, now: Date): boolean;
  retryAfterMs(key: string, now: Date): number;
};

type Window = { start: number; count: number };

const SWEEP_SIZE = 1000;

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const windows = new Map<string, Window>();

  const expired = (window: Window, at: number) => at - window.start >= windowMs;

  return {
    allow: (key: string, now: Date): boolean => {
      const at = now.getTime();

      if (windows.size > SWEEP_SIZE) sweep(windows, (window) => expired(window, at));

      const current = windows.get(key);

      if (current === undefined || expired(current, at)) {
        windows.set(key, { start: at, count: 1 });

        return true;
      }

      current.count += 1;

      return current.count <= limit;
    },
    retryAfterMs: (key: string, now: Date): number => {
      const current = windows.get(key);

      if (current === undefined) return 0;

      return Math.max(0, current.start + windowMs - now.getTime());
    },
  } satisfies RateLimiter;
}

function sweep(windows: Map<string, Window>, isExpired: (window: Window) => boolean): void {
  for (const [key, window] of windows) {
    if (isExpired(window)) windows.delete(key);
  }
}
