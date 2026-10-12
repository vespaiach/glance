import * as v from "valibot";
import {
  AccountSchema,
  AccountSettingsSchema,
  CalendarEventSchema,
  LinkRequestSchema,
  NameRequestSchema,
  NoteSchema,
  PhotoSchema,
  type Synced,
  SyncedEventSchema,
  WeatherSchema,
} from "./schemas";

const id = "0192f1a0-7c2e-7a3b-9c4d-1e2f3a4b5c6d";

const event = {
  id,
  startAt: "2026-10-09T17:30:00.000Z",
  endAt: "2026-10-09T18:15:00.000Z",
  title: "Grandma's video call",
  location: "Living room",
  tone: 1,
};

const note = {
  id,
  text: "Wi-Fi password is on the fridge!",
  author: "Dad",
  createdAt: "2026-10-09T15:12:00.000Z",
  tone: 1,
  rotation: -2,
};

const settings = {
  season: "auto",
  clock: "12h",
  tempUnit: "F",
  background: { mode: "season", dim: 0.2, rotate: "daily" },
  idleTimeout: 180,
  noteExpiry: "1w",
  ambientHours: { start: "18:00", end: "07:30" },
};

const hour = { time: "2026-10-09T18:00:00.000Z", icon: "cloud-sun", temp: 64 };
const day = { date: "2026-10-09", icon: "cloud-sun", high: 68, low: 51, precip: 20 };

const weather = {
  location: "Portland, OR",
  fetchedAt: "2026-10-09T17:41:00.000Z",
  current: {
    temp: 64,
    condition: "Partly cloudy",
    icon: "cloud-sun",
    high: 68,
    low: 51,
    feelsLike: 62,
    windMph: 8,
    windDir: "NW",
    humidity: 62,
    uv: 3,
    sunset: "2026-10-10T01:42:00.000Z",
  },
  hourly: Array.from({ length: 8 }, () => hour),
  daily: Array.from({ length: 7 }, () => day),
};

const accepts = (schema: v.GenericSchema, input: unknown) => v.safeParse(schema, input).success;

describe("CalendarEventSchema", () => {
  it("D6 accepts an event with and without an end time", () => {
    const { endAt: _, ...noEnd } = event;

    expect(accepts(CalendarEventSchema, event)).toBe(true);
    expect(accepts(CalendarEventSchema, noEnd)).toBe(true);
  });

  it("D6 rejects a blank title", () => {
    expect(accepts(CalendarEventSchema, { ...event, title: "   " })).toBe(false);
  });

  it("D6 rejects a start that isn't an ISO timestamp", () => {
    expect(accepts(CalendarEventSchema, { ...event, startAt: "10:30" })).toBe(false);
  });

  it("D6 rejects an id that isn't a UUID", () => {
    expect(accepts(CalendarEventSchema, { ...event, id: "e1" })).toBe(false);
  });

  it("D6 rejects an end that isn't after the start", () => {
    expect(accepts(CalendarEventSchema, { ...event, endAt: event.startAt })).toBe(false);
  });

  it("tech§6.1 rejects an event spanning 24 hours or more", () => {
    expect(accepts(CalendarEventSchema, { ...event, endAt: "2026-10-10T17:30:00.000Z" })).toBe(
      false,
    );
  });

  it("D6 rejects an unknown tone", () => {
    expect(accepts(CalendarEventSchema, { ...event, tone: 5 })).toBe(false);
  });
});

describe("SyncedEventSchema", () => {
  it("D10 accepts server fields and a tombstone", () => {
    const row = { ...event, updatedAt: "2026-10-09T17:00:00.000Z", version: 7 };

    expect(accepts(SyncedEventSchema, row)).toBe(true);
    expect(accepts(SyncedEventSchema, { ...row, deletedAt: "2026-10-09T17:05:00.000Z" })).toBe(
      true,
    );
  });

  it("D10 rejects a row without a version", () => {
    expect(accepts(SyncedEventSchema, { ...event, updatedAt: "2026-10-09T17:00:00.000Z" })).toBe(
      false,
    );
  });

  it("D6 Synced<T> adds updatedAt, version and an optional deletedAt", () => {
    expectTypeOf<Synced<{ id: string }>>().toEqualTypeOf<
      { id: string } & { updatedAt: string; version: number; deletedAt?: string }
    >();
  });
});

describe("NoteSchema", () => {
  it("D6 accepts a note", () => {
    expect(accepts(NoteSchema, note)).toBe(true);
  });

  it("NOTE-02 rejects the accent tone", () => {
    expect(accepts(NoteSchema, { ...note, tone: "accent" })).toBe(false);
  });

  it("NOTE-03 rejects an empty message", () => {
    expect(accepts(NoteSchema, { ...note, text: "  \n " })).toBe(false);
  });
});

describe("PhotoSchema", () => {
  const photo = {
    id,
    title: "Cannon Beach",
    takenOn: "2026-09-06",
    place: "Summer trip",
    createdAt: "2026-09-06T20:00:00.000Z",
  };

  it("D6 accepts a photo with or without a place", () => {
    const { place: _, ...noPlace } = photo;

    expect(accepts(PhotoSchema, photo)).toBe(true);
    expect(accepts(PhotoSchema, noPlace)).toBe(true);
  });

  it("PHOTO-03 rejects a takenOn that isn't a date", () => {
    expect(accepts(PhotoSchema, { ...photo, takenOn: "Sep 6" })).toBe(false);
  });
});

describe("AccountSettingsSchema", () => {
  it("D6 accepts settings with a weather location", () => {
    const weatherLocation = { name: "Portland", region: "OR", lat: 45.52, lon: -122.68 };

    expect(accepts(AccountSettingsSchema, { ...settings, weatherLocation })).toBe(true);
  });

  it("SET-06 rejects ambient hours other than 6:00 PM – 7:30 AM", () => {
    const ambientHours = { start: "20:00", end: "07:30" };

    expect(accepts(AccountSettingsSchema, { ...settings, ambientHours })).toBe(false);
  });

  it("BG-04 rejects a dim outside Off, Light and Strong", () => {
    const background = { ...settings.background, dim: 0.5 };

    expect(accepts(AccountSettingsSchema, { ...settings, background })).toBe(false);
  });

  it("SET-07 accepts Never for idle and note expiry", () => {
    expect(
      accepts(AccountSettingsSchema, { ...settings, idleTimeout: null, noteExpiry: null }),
    ).toBe(true);
  });

  it("D13 rejects a weather location outside lat/lon range", () => {
    const weatherLocation = { name: "Nowhere", region: "", lat: 91, lon: 0 };

    expect(accepts(AccountSettingsSchema, { ...settings, weatherLocation })).toBe(false);
  });
});

describe("WeatherSchema", () => {
  it("D6 accepts the fixture forecast", () => {
    expect(accepts(WeatherSchema, weather)).toBe(true);
  });

  it("D6 requires 8 hourly points and 7 days", () => {
    expect(accepts(WeatherSchema, { ...weather, hourly: weather.hourly.slice(1) })).toBe(false);
    expect(accepts(WeatherSchema, { ...weather, daily: weather.daily.slice(1) })).toBe(false);
  });

  it("WX-03 keeps the precipitation chance of an hourly point", () => {
    const hourly = weather.hourly.map((point) => ({ ...point, precip: 70 }));

    expect(v.parse(WeatherSchema, { ...weather, hourly }).hourly[0]?.precip).toBe(70);
  });

  it("D6 rejects an icon outside the weather set", () => {
    const current = { ...weather.current, icon: "house" };

    expect(accepts(WeatherSchema, { ...weather, current })).toBe(false);
  });
});

describe("AccountSchema", () => {
  it("SIGNIN-06 accepts an account with no name yet", () => {
    expect(accepts(AccountSchema, { id, email: "maria@example.com", name: null })).toBe(true);
  });

  it("SIGNIN-02 rejects an invalid email", () => {
    expect(accepts(AccountSchema, { id, email: "maria@", name: "Maria" })).toBe(false);
  });
});

describe("LinkRequestSchema", () => {
  it("SIGNIN-12 accepts an email and an IANA time zone", () => {
    expect(
      accepts(LinkRequestSchema, { email: "maria@example.com", timeZone: "America/New_York" }),
    ).toBe(true);
  });

  it("SIGNIN-02 rejects an invalid email", () => {
    expect(accepts(LinkRequestSchema, { email: "maria@", timeZone: "America/New_York" })).toBe(
      false,
    );
  });

  it("tech§6.2 rejects a time zone that isn't an IANA name", () => {
    expect(accepts(LinkRequestSchema, { email: "maria@example.com", timeZone: "Mars/Base" })).toBe(
      false,
    );
  });
});

describe("NameRequestSchema", () => {
  it("SIGNIN-06 accepts a name", () => {
    expect(accepts(NameRequestSchema, { name: "Maria" })).toBe(true);
  });

  it("SIGNIN-06 rejects a blank name", () => {
    expect(accepts(NameRequestSchema, { name: "   " })).toBe(false);
  });

  it("tech§6.1 rejects a name over 100 characters", () => {
    expect(accepts(NameRequestSchema, { name: "a".repeat(101) })).toBe(false);
  });
});
