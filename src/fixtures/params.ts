import { codeDigits } from "@/domain/signIn";
import { zonedInstant } from "@/domain/zone";
import { FIXTURE_TIME_ZONE, fixturePhotoId, fixtureTagId } from "./data";

const CHOICES = {
  sheet: ["event", "newevent", "note", "newnote", "allday", "past", "photo", "photometa"],
  time: ["start", "end", "error", "noend"],
  season: ["spring", "summer", "fall", "winter"],
  net: ["loading", "offline", "wxerror"],
  signin: [
    "form",
    "sending",
    "sent",
    "checking",
    "wrong",
    "locked",
    "name",
    "location",
    "expired",
    "offline",
    "done",
    "ended",
    "sendfail",
  ],
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
  rail: ["1", "open"],
  events: ["many", "none"],
  chrome: ["0"],
  qr: ["open", "failed"],
  dp: ["open"],
  potd: ["qr", "error"],
  play: ["0"],
} as const;

type Choices = typeof CHOICES;

type ChoiceParams = { [K in keyof Choices]?: Choices[K][number] };

export type FixtureParams = ChoiceParams & {
  allday?: true;
  backin?: number;
  bg?: "photo";
  clock?: "24h";
  code?: string;
  day?: string;
  demo?: true;
  details?: true;
  discard?: true;
  empty?: true;
  full?: true;
  hold?: true;
  kb?: true;
  keepPlace?: true;
  now?: Date;
  pending?: number;
  phdel?: true;
  phqr?: true;
  potdPhoto?: string;
  potdlong?: true;
  span24?: true;
  switch?: true;
  who?: string[];
  whosheet?: true;
};

const PLACE_PAGE = "/settings/location";

const ISO_DATE_TIME =
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;

const HAS_OFFSET = /(Z|[+-]\d{2}:\d{2})$/;

const OCTOBER_DAY = /^([1-9]|[12]\d|3[01])$/;

const NOBODY = "none";

const BACKIN_MAX = 10;

export function parseFixtureParams(search: string | URLSearchParams, pathname = ""): FixtureParams {
  const query = new URLSearchParams(search);

  const now = parseNow(query.get("now"));

  const keepPlace = pathname === PLACE_PAGE;

  const pending = parseCount(query.get("pending"));

  const day = octoberDay(query.get("day"));

  const who = fixtureWho(query.get("who"));

  const backin = parseBackin(query.get("backin"));

  const code = codeDigits(query.get("code") ?? "");

  const potdPhoto = fixturePhotoId(query.get("potd") ?? "");

  return {
    ...readChoices(query),
    ...readFlags(query),
    ...(now && { now }),
    ...(keepPlace && { keepPlace }),
    ...(pending !== undefined && { pending }),
    ...(day && { day }),
    ...(who && { who }),
    ...(backin !== undefined && { backin }),
    ...(code && { code }),
    ...(potdPhoto && { potdPhoto }),
  };
}

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
    ...(query.get("demo") === "1" && { demo: true }),
    ...(query.get("details") === "1" && { details: true }),
    ...(query.get("discard") === "1" && { discard: true }),
    ...(query.get("empty") === "1" && { empty: true }),
    ...(query.get("full") === "1" && { full: true }),
    ...(query.get("hold") === "1" && { hold: true }),
    ...(query.get("kb") === "1" && { kb: true }),
    ...(query.get("phdel") === "1" && { phdel: true }),
    ...(query.get("phqr") === "1" && { phqr: true }),
    ...(query.get("potdlong") === "1" && { potdlong: true }),
    ...(query.get("span") === "24" && { span24: true }),
    ...(query.get("switch") === "1" && { switch: true }),
    ...(query.get("whosheet") === "1" && { whosheet: true }),
  };
}

function octoberDay(value: string | null): string | undefined {
  if (value === null || !OCTOBER_DAY.test(value)) return undefined;

  return `2026-10-${value.padStart(2, "0")}`;
}

function fixtureWho(value: string | null): string[] | undefined {
  if (value === NOBODY) return [];

  const ids = (value ?? "").split(",").flatMap((key) => fixtureTagId(key) ?? []);

  return ids.length > 0 ? ids : undefined;
}

function parseBackin(value: string | null): number | undefined {
  const seconds = parseCount(value);

  return seconds !== undefined && seconds <= BACKIN_MAX ? seconds : undefined;
}

function parseCount(value: string | null): number | undefined {
  return value !== null && /^\d+$/.test(value) ? Number(value) : undefined;
}
