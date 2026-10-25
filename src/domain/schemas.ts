import * as v from "valibot";
import { QR_OPENS } from "./qrSignIn";
import { isTimeZone, isValidEmail } from "./signIn";

const DAY_MS = 24 * 60 * 60 * 1000;

const IdSchema = v.pipe(v.string(), v.uuid());

const IsoTimestampSchema = v.pipe(v.string(), v.isoTimestamp());

export const IsoDateSchema = v.pipe(v.string(), v.isoDate());

const RequiredTextSchema = v.pipe(
  v.string(),
  v.check((text) => text.trim() !== ""),
);

export const ToneSchema = v.picklist([1, 2, 3, 4, "soft", "accent"]);
export type Tone = v.InferOutput<typeof ToneSchema>;

export const TagColorSchema = v.picklist([
  "lilac",
  "sky",
  "coral",
  "mint",
  "sun",
  "pink",
  "lime",
  "rust",
  "glacier",
  "amber",
  "sage",
  "ice",
]);
export type TagColor = v.InferOutput<typeof TagColorSchema>;

export const SeasonSchema = v.picklist(["spring", "summer", "fall", "winter"]);
export type Season = v.InferOutput<typeof SeasonSchema>;

const serverEntries = {
  updatedAt: IsoTimestampSchema,
  version: v.pipe(v.number(), v.integer(), v.minValue(0)),
  deletedAt: v.optional(IsoTimestampSchema),
};

export const ServerFieldsSchema = v.object(serverEntries);
export type Synced<T> = T & v.InferOutput<typeof ServerFieldsSchema>;

const eventEntries = {
  id: IdSchema,
  startAt: IsoTimestampSchema,
  endAt: v.optional(IsoTimestampSchema),
  title: RequiredTextSchema,
  location: v.optional(v.string()),
  allDay: v.optional(v.literal(true)),
  everyone: v.boolean(),
  tagIds: v.array(IdSchema),
  notes: v.optional(v.string()),
  notify: v.optional(v.boolean()),
};

type EventSpan = { startAt: string; endAt?: string; allDay?: true };

type EventWho = { everyone: boolean; tagIds: string[] };

const EventObjectSchema = v.object(eventEntries);

export const CalendarEventSchema = v.pipe(
  EventObjectSchema,
  v.check<v.InferOutput<typeof EventObjectSchema>>(spanIsValid),
  v.check<v.InferOutput<typeof EventObjectSchema>>(whoIsValid),
);
export type CalendarEvent = v.InferOutput<typeof CalendarEventSchema>;

const SyncedEventObjectSchema = v.object({ ...eventEntries, ...serverEntries });

export const SyncedEventSchema = v.pipe(
  SyncedEventObjectSchema,
  v.check<v.InferOutput<typeof SyncedEventObjectSchema>>(spanIsValid),
  v.check<v.InferOutput<typeof SyncedEventObjectSchema>>(whoIsValid),
);

export const TagSchema = v.object({
  id: IdSchema,
  name: RequiredTextSchema,
  color: TagColorSchema,
  createdAt: IsoTimestampSchema,
});
export type Tag = v.InferOutput<typeof TagSchema>;

export const SyncedTagSchema = v.object({ ...TagSchema.entries, ...serverEntries });

export const NOTE_LIMITS = { text: 280, author: 32 } as const;

export const NoteSchema = v.object({
  id: IdSchema,
  text: v.pipe(
    RequiredTextSchema,
    v.check((text) => text.trim().length <= NOTE_LIMITS.text),
  ),
  author: v.pipe(v.string(), v.maxLength(NOTE_LIMITS.author)),
  createdAt: IsoTimestampSchema,
  rotation: v.pipe(v.number(), v.finite()),
});
export type Note = v.InferOutput<typeof NoteSchema>;

export const SyncedNoteSchema = v.object({ ...NoteSchema.entries, ...serverEntries });

export const PhotoSourcesSchema = v.object({
  title: v.picklist(["photo", "file-name", "place", "file", "edited"]),
  takenOn: v.picklist(["photo", "file-name", "file-date", "none", "edited"]),
  place: v.picklist(["photo-location", "none", "edited"]),
});
export type PhotoSources = v.InferOutput<typeof PhotoSourcesSchema>;

export const PhotoSchema = v.object({
  id: IdSchema,
  title: v.string(),
  takenOn: v.optional(IsoDateSchema),
  place: v.optional(v.string()),
  createdAt: IsoTimestampSchema,
  sources: PhotoSourcesSchema,
  checked: v.boolean(),
  fileName: v.optional(v.string()),
});
export type Photo = v.InferOutput<typeof PhotoSchema>;

export const SyncedPhotoSchema = v.object({ ...PhotoSchema.entries, ...serverEntries });

export const WeatherLocationSchema = v.object({
  name: v.string(),
  region: v.string(),
  lat: v.pipe(v.number(), v.minValue(-90), v.maxValue(90)),
  lon: v.pipe(v.number(), v.minValue(-180), v.maxValue(180)),
  timeZone: v.optional(v.pipe(v.string(), v.check(isTimeZone))),
});
export type WeatherLocation = v.InferOutput<typeof WeatherLocationSchema>;

const AmbientTimeSchema = v.pipe(v.string(), v.regex(/^([01]\d|2[0-3]):(00|15|30|45)$/));

const AmbientSetSchema = v.object({ start: AmbientTimeSchema, end: AmbientTimeSchema });

export const AmbientSchema = v.object({
  mode: v.picklist(["same", "split", "off"]),
  all: AmbientSetSchema,
  wknd: AmbientSetSchema,
});
export type Ambient = v.InferOutput<typeof AmbientSchema>;
export type AmbientSet = Ambient["all"];

export const DEFAULT_AMBIENT: Ambient = {
  mode: "same",
  all: { start: "18:00", end: "07:30" },
  wknd: { start: "21:00", end: "09:00" },
};

export const IDLE_MINUTES = { min: 1, max: 15 } as const;

export const NOTE_DAYS = { min: 1, max: 30 } as const;

export const AccountSettingsSchema = v.object({
  season: v.picklist(["auto", ...SeasonSchema.options]),
  clock: v.picklist(["12h", "24h"]),
  tempUnit: v.picklist(["F", "C"]),
  background: v.object({
    mode: v.picklist(["season", "photo", "slideshow"]),
    photoId: v.optional(IdSchema),
    dim: v.picklist([0, 0.2, 0.4]),
    rotate: v.picklist(["hourly", "daily", "weekly"]),
  }),
  idleTimeout: v.object({
    on: v.boolean(),
    minutes: v.pipe(
      v.number(),
      v.integer(),
      v.minValue(IDLE_MINUTES.min),
      v.maxValue(IDLE_MINUTES.max),
    ),
  }),
  noteExpiry: v.object({
    on: v.boolean(),
    days: v.pipe(v.number(), v.integer(), v.minValue(NOTE_DAYS.min), v.maxValue(NOTE_DAYS.max)),
  }),
  hideSidebarWhenIdle: v.optional(v.boolean(), true),
  ambientBrightness: v.optional(v.picklist(["full", "medium", "low"]), "medium"),
  ambient: v.optional(AmbientSchema, DEFAULT_AMBIENT),
  notifyLead: v.optional(v.picklist(["off", 15, 30]), 15),
  chime: v.optional(v.boolean(), true),
  weatherLocation: v.optional(WeatherLocationSchema),
});
export type AccountSettings = v.InferOutput<typeof AccountSettingsSchema>;

export const SyncedSettingsSchema = v.object({
  ...AccountSettingsSchema.entries,
  ...serverEntries,
});

export const WeatherIconSchema = v.picklist([
  "sun",
  "moon",
  "cloud-sun",
  "cloud-moon",
  "cloud",
  "cloudy",
  "cloud-fog",
  "cloud-drizzle",
  "cloud-rain",
  "cloud-snow",
  "snowflake",
  "cloud-lightning",
]);
export type WeatherIcon = v.InferOutput<typeof WeatherIconSchema>;

const HourlyPointSchema = v.object({
  time: IsoTimestampSchema,
  icon: WeatherIconSchema,
  temp: v.number(),
  precip: v.optional(v.number()),
});

const DailyPointSchema = v.object({
  date: IsoDateSchema,
  icon: WeatherIconSchema,
  high: v.number(),
  low: v.number(),
  precip: v.optional(v.number()),
});

export const WeatherSchema = v.object({
  location: v.string(),
  fetchedAt: IsoTimestampSchema,
  current: v.object({
    temp: v.number(),
    condition: v.string(),
    icon: WeatherIconSchema,
    high: v.number(),
    low: v.number(),
    feelsLike: v.number(),
    windMph: v.number(),
    windDir: v.string(),
    humidity: v.number(),
    uv: v.number(),
    sunset: IsoTimestampSchema,
  }),
  hourly: v.pipe(v.array(HourlyPointSchema), v.length(8)),
  daily: v.pipe(v.array(DailyPointSchema), v.length(7)),
});
export type Weather = v.InferOutput<typeof WeatherSchema>;

export const AccountSchema = v.object({
  id: IdSchema,
  email: v.pipe(v.string(), v.email()),
  name: v.nullable(v.string()),
});
export type Account = v.InferOutput<typeof AccountSchema>;

export const CodeRequestSchema = v.object({
  email: v.pipe(v.string(), v.check(isValidEmail)),
  timeZone: v.pipe(v.string(), v.check(isTimeZone)),
});
export type CodeRequest = v.InferOutput<typeof CodeRequestSchema>;

export const CodeVerifySchema = v.object({
  email: v.pipe(v.string(), v.check(isValidEmail)),
  code: v.pipe(v.string(), v.regex(/^\d{6}$/)),
});
export type CodeVerify = v.InferOutput<typeof CodeVerifySchema>;

export const LinkVerifySchema = v.object({ t: v.pipe(v.string(), v.minLength(1)) });
export type LinkVerify = v.InferOutput<typeof LinkVerifySchema>;

export const QrIssueRequestSchema = v.optional(
  v.object({ opens: v.optional(v.picklist(QR_OPENS)) }),
  {},
);
export type QrIssueRequest = v.InferOutput<typeof QrIssueRequestSchema>;

export const QrVoidRequestSchema = v.object({
  url: v.pipe(v.string(), v.url()),
});
export type QrVoidRequest = v.InferOutput<typeof QrVoidRequestSchema>;

export const NameRequestSchema = v.object({
  name: v.pipe(RequiredTextSchema, v.maxLength(100)),
});
export type NameRequest = v.InferOutput<typeof NameRequestSchema>;

export const LocationRequestSchema = v.union([
  v.object({ place: WeatherLocationSchema }),
  v.object({ skip: v.literal(true) }),
]);
export type LocationRequest = v.InferOutput<typeof LocationRequestSchema>;

const PushKeySchema = v.pipe(v.string(), v.nonEmpty(), v.maxLength(256));

export const PushSubscriptionSchema = v.object({
  endpoint: v.pipe(v.string(), v.url(), v.startsWith("https://"), v.maxLength(2048)),
  keys: v.object({ p256dh: PushKeySchema, auth: PushKeySchema }),
});
export type PushSubscription = v.InferOutput<typeof PushSubscriptionSchema>;

export const DisplaySchema = v.object({
  id: IdSchema,
  accountId: IdSchema,
});
export type Display = v.InferOutput<typeof DisplaySchema>;

function spanIsValid({ startAt, endAt, allDay }: EventSpan) {
  if (allDay) return endAt === undefined && Date.parse(startAt) % DAY_MS === 0;

  if (endAt === undefined) return true;

  const span = Date.parse(endAt) - Date.parse(startAt);

  return span > 0 && span < DAY_MS;
}

function whoIsValid({ everyone, tagIds }: EventWho) {
  return !everyone || tagIds.length === 0;
}
