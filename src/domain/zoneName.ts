import { wallTime } from "./zone";

export type ZoneChange =
  | { kind: "same-now" }
  | { kind: "shift"; hours: number; direction: "ahead" | "back" };

const US_ZONES: Readonly<Record<string, readonly string[]>> = {
  Eastern: [
    "America/New_York",
    "America/Detroit",
    "America/Fort_Wayne",
    "America/Indiana/Indianapolis",
    "America/Indiana/Marengo",
    "America/Indiana/Petersburg",
    "America/Indiana/Vevay",
    "America/Indiana/Vincennes",
    "America/Indiana/Winamac",
    "America/Indianapolis",
    "America/Kentucky/Louisville",
    "America/Kentucky/Monticello",
    "America/Louisville",
    "US/East-Indiana",
    "US/Eastern",
    "US/Michigan",
  ],
  Central: [
    "America/Chicago",
    "America/Indiana/Knox",
    "America/Indiana/Tell_City",
    "America/Knox_IN",
    "America/Menominee",
    "America/North_Dakota/Beulah",
    "America/North_Dakota/Center",
    "America/North_Dakota/New_Salem",
    "US/Central",
    "US/Indiana-Starke",
  ],
  Mountain: ["America/Denver", "America/Boise", "America/Shiprock", "Navajo", "US/Mountain"],
  Arizona: ["America/Phoenix", "US/Arizona"],
  Pacific: ["America/Los_Angeles", "US/Pacific"],
  Alaska: [
    "America/Anchorage",
    "America/Juneau",
    "America/Metlakatla",
    "America/Nome",
    "America/Sitka",
    "America/Yakutat",
    "US/Alaska",
  ],
  Hawaii: ["Pacific/Honolulu", "Pacific/Johnston", "US/Hawaii"],
  Atlantic: ["America/Puerto_Rico", "America/St_Thomas", "America/Virgin"],
  Chamorro: ["Pacific/Guam", "Pacific/Saipan"],
  Samoa: ["Pacific/Pago_Pago", "Pacific/Midway", "Pacific/Samoa", "US/Samoa"],
};

const ZONE_NAMES = new Map(
  Object.entries(US_ZONES).flatMap(([name, zones]) => zones.map((zone) => [zone, name] as const)),
);

const MINUTE_MS = 60_000;

const NAMED_AT = new Date("2026-01-01T00:00:00Z");

export function timeZoneName(zone: string): string {
  const name = ZONE_NAMES.get(zone);

  return name ? `${name} time` : genericName(zone);
}

export function zoneChange(from: string, to: string, at: Date): ZoneChange {
  const minutes = offsetMinutes(at, to) - offsetMinutes(at, from);

  if (minutes === 0) return { kind: "same-now" };

  return {
    kind: "shift",
    hours: Math.abs(minutes) / 60,
    direction: minutes > 0 ? "ahead" : "back",
  };
}

export function asksZoneChange(saved: string | undefined, next: string | undefined): boolean {
  if (saved === undefined || next === undefined) return false;

  return timeZoneName(saved) !== timeZoneName(next);
}

function genericName(zone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    timeZoneName: "longGeneric",
  }).formatToParts(NAMED_AT);

  const name = parts.find((part) => part.type === "timeZoneName")?.value ?? zone;

  return name.replace(/ Time$/, " time");
}

function offsetMinutes(at: Date, zone: string): number {
  const wall = wallTime(at, zone);

  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);

  return Math.round((asUtc - Math.floor(at.getTime() / MINUTE_MS) * MINUTE_MS) / MINUTE_MS);
}
