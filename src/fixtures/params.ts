import { zonedInstant } from "@/domain/zone";
import { FIXTURE_TIME_ZONE } from "./data";

const CHOICES = {
  sheet: ["event", "newevent", "note", "newnote", "allday", "photo", "photometa"],
  time: ["start", "end", "error", "noend"],
  season: ["spring", "summer", "fall", "winter"],
  net: ["loading", "offline", "wxerror"],
  signin: [
    "form",
    "sending",
    "sent",
    "name",
    "location",
    "phone",
    "expired",
    "offline",
    "done",
    "ended",
    "sendfail",
  ],
  on: ["link"],
  acct: ["returning"],
  upload: ["one", "progress", "error", "offline", "done"],
  wx: [
    "searching",
    "unknown",
    "choose",
    "locating",
    "no-position",
    "denied",
    "outside",
    "lookup",
    "savefail",
    "tz",
  ],
  amb: ["same", "split", "off"],
  pick: ["all.s", "all.e", "wknd.s", "wknd.e"],
  barauto: ["off"],
  rail: ["1", "open"],
  events: ["many"],
  chrome: ["0"],
  qr: ["open", "failed"],
} as const;

type Choices = typeof CHOICES;

type ChoiceParams = { [K in keyof Choices]?: Choices[K][number] };

export type FixtureParams = ChoiceParams & {
  allday?: true;
  bg?: "photo";
  clock?: "24h";
  discard?: true;
  empty?: true;
  full?: true;
  kb?: true;
  keepPlace?: true;
  now?: Date;
  pending?: number;
  switch?: true;
};

const PLACE_PAGE = "/settings/location";

const ISO_DATE_TIME =
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;

const HAS_OFFSET = /(Z|[+-]\d{2}:\d{2})$/;

function fixtureWallTime(value: string): Date {
  const wall = new Date(`${value}Z`);

  const date = {
    year: wall.getUTCFullYear(),
    month: wall.getUTCMonth() + 1,
    day: wall.getUTCDate(),
  };

  const minutes = wall.getUTCHours() * 60 + wall.getUTCMinutes();

  const start = zonedInstant(FIXTURE_TIME_ZONE, date, minutes);

  return new Date(start.getTime() + (wall.getTime() % 60_000));
}

function parseNow(value: string | null): Date | undefined {
  if (value === null || !ISO_DATE_TIME.test(value)) return undefined;

  const now = HAS_OFFSET.test(value) ? new Date(value) : fixtureWallTime(value);

  return Number.isNaN(now.getTime()) ? undefined : now;
}

function readChoices(query: URLSearchParams): ChoiceParams {
  const entries = Object.entries(CHOICES).flatMap(([name, values]) => {
    const value = query.get(name);

    return (values as readonly string[]).includes(value ?? "") ? [[name, value]] : [];
  });

  return Object.fromEntries(entries);
}

function readFlags(query: URLSearchParams): FixtureParams {
  return {
    ...(query.get("allday") === "1" && { allday: true }),
    ...(query.get("bg") === "photo" && { bg: "photo" }),
    ...(query.get("clock") === "24" && { clock: "24h" }),
    ...(query.get("discard") === "1" && { discard: true }),
    ...(query.get("empty") === "1" && { empty: true }),
    ...(query.get("full") === "1" && { full: true }),
    ...(query.get("kb") === "1" && { kb: true }),
    ...(query.get("switch") === "1" && { switch: true }),
  };
}

function parseCount(value: string | null): number | undefined {
  return value !== null && /^\d+$/.test(value) ? Number(value) : undefined;
}

export function parseFixtureParams(search: string | URLSearchParams, pathname = ""): FixtureParams {
  const query = new URLSearchParams(search);

  const now = parseNow(query.get("now"));

  const keepPlace = pathname === PLACE_PAGE;

  const pending = parseCount(query.get("pending"));

  return {
    ...readChoices(query),
    ...readFlags(query),
    ...(now && { now }),
    ...(keepPlace && { keepPlace }),
    ...(pending !== undefined && { pending }),
  };
}
