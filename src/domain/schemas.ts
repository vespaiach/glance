import * as v from "valibot";

const DAY_MS = 24 * 60 * 60 * 1000;

const IdSchema = v.pipe(v.string(), v.uuid());

const IsoTimestampSchema = v.pipe(v.string(), v.isoTimestamp());

const IsoDateSchema = v.pipe(v.string(), v.isoDate());

const RequiredTextSchema = v.pipe(
  v.string(),
  v.check((text) => text.trim() !== ""),
);

export const ToneSchema = v.picklist([1, 2, 3, 4, "soft", "accent"]);
export type Tone = v.InferOutput<typeof ToneSchema>;

export const NoteToneSchema = v.picklist([1, 2, 3, 4, "soft"]);
export type NoteTone = v.InferOutput<typeof NoteToneSchema>;

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
  tone: ToneSchema,
};

function spanIsValid({ startAt, endAt }: { startAt: string; endAt?: string }) {
  if (endAt === undefined) return true;

  const span = Date.parse(endAt) - Date.parse(startAt);

  return span > 0 && span < DAY_MS;
}

const EventObjectSchema = v.object(eventEntries);

export const CalendarEventSchema = v.pipe(
  EventObjectSchema,
  v.check<v.InferOutput<typeof EventObjectSchema>>(spanIsValid),
);
export type CalendarEvent = v.InferOutput<typeof CalendarEventSchema>;

const SyncedEventObjectSchema = v.object({ ...eventEntries, ...serverEntries });

export const SyncedEventSchema = v.pipe(
  SyncedEventObjectSchema,
  v.check<v.InferOutput<typeof SyncedEventObjectSchema>>(spanIsValid),
);

export const NoteSchema = v.object({
  id: IdSchema,
  text: RequiredTextSchema,
  author: RequiredTextSchema,
  createdAt: IsoTimestampSchema,
  tone: NoteToneSchema,
  rotation: v.pipe(v.number(), v.finite()),
});
export type Note = v.InferOutput<typeof NoteSchema>;

export const SyncedNoteSchema = v.object({ ...NoteSchema.entries, ...serverEntries });

export const PhotoSchema = v.object({
  id: IdSchema,
  title: v.string(),
  takenOn: IsoDateSchema,
  place: v.optional(v.string()),
  createdAt: IsoTimestampSchema,
});
export type Photo = v.InferOutput<typeof PhotoSchema>;

export const SyncedPhotoSchema = v.object({ ...PhotoSchema.entries, ...serverEntries });

export const WeatherLocationSchema = v.object({
  name: v.string(),
  region: v.string(),
  lat: v.pipe(v.number(), v.minValue(-90), v.maxValue(90)),
  lon: v.pipe(v.number(), v.minValue(-180), v.maxValue(180)),
});
export type WeatherLocation = v.InferOutput<typeof WeatherLocationSchema>;

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
  idleTimeout: v.nullable(v.picklist([60, 180, 300])),
  noteExpiry: v.nullable(v.picklist(["1d", "1w"])),
  ambientHours: v.object({ start: v.literal("18:00"), end: v.literal("07:30") }),
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

export const DisplaySchema = v.object({
  id: IdSchema,
  accountId: IdSchema,
});
export type Display = v.InferOutput<typeof DisplaySchema>;
