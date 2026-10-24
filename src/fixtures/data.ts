import { DEFAULT_SETTINGS } from "@/domain/defaults";
import type {
  Account,
  AccountSettings,
  Weather,
  WeatherIcon,
  WeatherLocation,
} from "@/domain/schemas";
import type { SignedInScreen } from "@/domain/screens";
import { zonedInstant } from "@/domain/zone";

const fixtureId = (group: number, n: number) =>
  `0000000${group}-0000-4000-8000-${String(n).padStart(12, "0")}`;

const FIXTURE_TIME_ZONE = "America/Los_Angeles";

const octoberAt = (day: number, hour: number, minute = 0) =>
  zonedInstant(FIXTURE_TIME_ZONE, { year: 2026, month: 10, day }, hour * 60 + minute);

const at = (day: number, hour: number, minute = 0) => octoberAt(day, hour, minute).toISOString();

export const FIXTURE_ACCOUNT: Account = {
  id: fixtureId(4, 1),
  email: "maria@example.com",
  name: "Maria",
};

const MINUTE_MS = 60 * 1000;

const before = (now: Date, minutes: number) =>
  new Date(now.getTime() - minutes * MINUTE_MS).toISOString();

const PORTLAND_OR: WeatherLocation = {
  name: "Portland",
  region: "Oregon",
  lat: 45.5152,
  lon: -122.6784,
  timeZone: FIXTURE_TIME_ZONE,
};

export const FIXTURE_SETTINGS: AccountSettings = {
  ...DEFAULT_SETTINGS,
  background: { ...DEFAULT_SETTINGS.background, photoId: fixtureId(3, 6) },
  weatherLocation: PORTLAND_OR,
};

const HOURLY: [hour: number, icon: WeatherIcon, temp: number, precip: number][] = [
  [11, "cloud-sun", 64, 10],
  [12, "cloud-sun", 66, 10],
  [13, "cloud", 67, 20],
  [14, "cloud", 68, 30],
  [15, "cloud-drizzle", 65, 40],
  [16, "cloud-rain", 61, 70],
  [17, "cloud-rain", 58, 80],
  [18, "cloud", 56, 40],
];

const DAILY: [icon: WeatherIcon, high: number, low: number, precip?: number][] = [
  ["cloud-sun", 68, 51, 20],
  ["cloud-rain", 59, 48, 80],
  ["cloud", 61, 47, 30],
  ["sun", 66, 49],
  ["sun", 69, 50],
  ["cloud-sun", 65, 50, 10],
  ["cloud-lightning", 58, 46, 70],
];

const isoDate = (day: number) => `2026-10-${String(day).padStart(2, "0")}`;

export const FIXTURE_WEATHER: Weather = {
  location: "Portland, OR",
  fetchedAt: at(9, 10, 30),
  current: {
    temp: 64,
    condition: "partlyCloudy",
    icon: "cloud-sun",
    high: 68,
    low: 51,
    feelsLike: 62,
    windMph: 8,
    windDir: "NW",
    humidity: 62,
    uv: 3,
    sunset: at(9, 18, 42),
  },
  hourly: HOURLY.map(([hour, icon, temp, precip]) => ({ time: at(9, hour), icon, temp, precip })),
  daily: DAILY.map(([icon, high, low, precip], index) => ({
    date: isoDate(9 + index),
    icon,
    high,
    low,
    ...(precip !== undefined && { precip }),
  })),
};

export function fixtureScreens(now: Date): SignedInScreen[] {
  return [
    {
      id: fixtureId(9, 1),
      kind: "monitor",
      browser: "Chrome",
      lastSeenAt: now.toISOString(),
      current: true,
    },
    {
      id: fixtureId(9, 2),
      kind: "monitor",
      browser: "Edge",
      lastSeenAt: before(now, 12),
      current: false,
    },
    {
      id: fixtureId(9, 3),
      kind: "tablet",
      browser: "Safari",
      lastSeenAt: before(now, 24 * 60),
      current: false,
    },
    {
      id: fixtureId(9, 4),
      kind: "smartphone",
      browser: "Safari",
      lastSeenAt: at(2, 18, 30),
      current: false,
    },
  ];
}
