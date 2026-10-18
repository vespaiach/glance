import { formatMonthDay } from "./time";
import { dayNumber } from "./zone";

export const DEVICE_KINDS = ["monitor", "tablet", "smartphone"] as const;

export type DeviceKind = (typeof DEVICE_KINDS)[number];

export type Browser = "Edge" | "Firefox" | "Chrome" | "Safari";

export type Device = { kind: DeviceKind; browser: Browser | null };

export type SignedInScreen = Device & { id: string; lastSeenAt: string; current: boolean };

export type ActiveStamp =
  | { kind: "minutes"; count: number }
  | { kind: "hours"; count: number }
  | { kind: "yesterday" }
  | { kind: "on"; date: string };

const BROWSERS: readonly [Browser, RegExp][] = [
  ["Edge", /\bEdg(e|A|iOS)?\//],
  ["Firefox", /\b(Firefox|FxiOS)\//],
  ["Chrome", /\b(Chrome|CriOS)\//],
  ["Safari", /\bVersion\/[\d.]+.*\bSafari\//],
];

const MINUTE_MS = 60 * 1000;

const HOUR_MS = 60 * MINUTE_MS;

export function deviceOf(userAgent: string | null | undefined): Device {
  const agent = userAgent ?? "";

  return { kind: deviceKind(agent), browser: browserOf(agent) };
}

export function activeStamp(lastSeenAt: string, now: Date, tz: string): ActiveStamp {
  const seen = new Date(lastSeenAt);

  const ago = now.getTime() - seen.getTime();

  if (ago < HOUR_MS) return { kind: "minutes", count: Math.max(1, Math.floor(ago / MINUTE_MS)) };

  const daysAgo = dayNumber(now, tz) - dayNumber(seen, tz);

  if (daysAgo === 0) return { kind: "hours", count: Math.floor(ago / HOUR_MS) };

  return daysAgo === 1 ? { kind: "yesterday" } : { kind: "on", date: formatMonthDay(seen, tz) };
}

function deviceKind(userAgent: string): DeviceKind {
  if (/\b(iPhone|iPod)\b/.test(userAgent)) return "smartphone";

  if (/\biPad\b/.test(userAgent)) return "tablet";

  if (!/\bAndroid\b/.test(userAgent)) return "monitor";

  return /\bMobile\b/.test(userAgent) ? "smartphone" : "tablet";
}

function browserOf(userAgent: string): Browser | null {
  return BROWSERS.find(([, pattern]) => pattern.test(userAgent))?.[0] ?? null;
}
