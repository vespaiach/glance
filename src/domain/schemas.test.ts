import * as v from "valibot";
import {
  AccountSchema,
  AccountSettingsSchema,
  CalendarEventSchema,
  LinkRequestSchema,
  MemberColorSchema,
  MemberSchema,
  NameRequestSchema,
  NoteSchema,
  PhotoSchema,
  QrVoidRequestSchema,
  type Synced,
  SyncedEventSchema,
  SyncedMemberSchema,
  WeatherSchema,
} from "./schemas";

const id = "0192f1a0-7c2e-7a3b-9c4d-1e2f3a4b5c6d";

const event = {
  id,
  startAt: "2026-10-09T17:30:00.000Z",
  endAt: "2026-10-09T18:15:00.000Z",
  title: "Grandma's video call",
  location: "Living room",
  everyone: true,
  memberIds: [],
};

const memberId = "0192f1a0-7c2e-7a3b-9c4d-1e2f3a4b5c6e";

const member = {
  id: memberId,
  name: "Minh-An",
  color: "lilac",
  createdAt: "2026-10-01T15:00:00.000Z",
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
  ambient: {
    mode: "same",
    all: { start: "18:00", end: "07:30" },
    wknd: { start: "21:00", end: "09:00" },
  },
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

  it("D24 accepts an event for some members with its notes", () => {
    const some = { ...event, everyone: false, memberIds: [memberId], notes: "Bring snacks" };

    expect(v.parse(CalendarEventSchema, some)).toEqual(some);
  });

  it("D24 rejects an event for everyone that also names members", () => {
    expect(accepts(CalendarEventSchema, { ...event, memberIds: [memberId] })).toBe(false);
  });

  it("D24 rejects an event for nobody", () => {
    expect(accepts(CalendarEventSchema, { ...event, everyone: false })).toBe(false);
  });

  it("D24 rejects a member id that isn't a UUID", () => {
    expect(accepts(CalendarEventSchema, { ...event, everyone: false, memberIds: ["dad"] })).toBe(
      false,
    );
  });

  it("D24 drops the old tone field", () => {
    expect(v.parse(CalendarEventSchema, { ...event, tone: 1 })).toEqual(event);
  });

  const { endAt: _, ...timed } = event;

  const allDay = { ...timed, startAt: "2026-10-16T00:00:00.000Z", allDay: true };

  it("D21 accepts an all-day event at its date's UTC midnight with no end", () => {
    expect(v.parse(CalendarEventSchema, allDay)).toEqual(allDay);
  });

  it("D21 rejects an all-day event with an end", () => {
    expect(accepts(CalendarEventSchema, { ...allDay, endAt: "2026-10-16T01:00:00.000Z" })).toBe(
      false,
    );
  });

  it("D21 rejects an all-day event that doesn't start at a UTC midnight", () => {
    expect(accepts(CalendarEventSchema, { ...allDay, startAt: "2026-10-16T07:00:00.000Z" })).toBe(
      false,
    );
  });

  it("D21 rejects allDay false, so a timed event leaves the field out", () => {
    expect(accepts(CalendarEventSchema, { ...allDay, allDay: false })).toBe(false);
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

  it("D21 checks an all-day row like an all-day event", () => {
    const row = { ...event, updatedAt: "2026-10-09T17:00:00.000Z", version: 7, allDay: true };

    expect(accepts(SyncedEventSchema, row)).toBe(false);
  });

  it("D24 accepts a tombstone left with no members", () => {
    const row = {
      ...event,
      everyone: false,
      updatedAt: "2026-10-09T17:00:00.000Z",
      version: 7,
      deletedAt: "2026-10-09T17:00:00.000Z",
    };

    expect(accepts(SyncedEventSchema, row)).toBe(true);
    expect(accepts(SyncedEventSchema, { ...row, deletedAt: undefined })).toBe(false);
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

describe("MemberSchema", () => {
  it("§7 accepts a member with a name, a block color and a created time", () => {
    expect(v.parse(MemberSchema, member)).toEqual(member);
  });

  it("FAM-04 rejects a blank name", () => {
    expect(accepts(MemberSchema, { ...member, name: "  " })).toBe(false);
  });

  it("§7 accepts each of the 12 block colors and nothing else", () => {
    expect(MemberColorSchema.options).toEqual([
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
    expect(accepts(MemberSchema, { ...member, color: "navy" })).toBe(false);
  });

  it("D10 a synced member adds the server fields", () => {
    const row = { ...member, updatedAt: "2026-10-09T17:00:00.000Z", version: 3 };

    expect(v.parse(SyncedMemberSchema, row)).toEqual(row);
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
    sources: { title: "file-name", takenOn: "file-date", place: "photo-location" },
    checked: false,
  };

  it("D6 accepts a photo with or without a place", () => {
    const { place: _, ...noPlace } = photo;

    expect(accepts(PhotoSchema, photo)).toBe(true);
    expect(accepts(PhotoSchema, noPlace)).toBe(true);
  });

  it("PHOTO-03 rejects a takenOn that isn't a date", () => {
    expect(accepts(PhotoSchema, { ...photo, takenOn: "Sep 6" })).toBe(false);
  });

  it("PHOTO-10 rejects a photo with no sources or an unknown source", () => {
    const { sources: _, ...noSources } = photo;

    expect(accepts(PhotoSchema, noSources)).toBe(false);
    expect(accepts(PhotoSchema, { ...photo, sources: { ...photo.sources, place: "file" } })).toBe(
      false,
    );
  });
});

describe("AccountSettingsSchema", () => {
  it("D6 accepts settings with a weather location", () => {
    const weatherLocation = { name: "Portland", region: "OR", lat: 45.52, lon: -122.68 };

    expect(accepts(AccountSettingsSchema, { ...settings, weatherLocation })).toBe(true);
  });

  it.each(["same", "split", "off"])("SET-10 accepts the %s schedule", (mode) => {
    const ambient = { ...settings.ambient, mode };

    expect(accepts(AccountSettingsSchema, { ...settings, ambient })).toBe(true);
  });

  it.each(["20:10", "24:00", "7:30", "late"])("SET-10 rejects the dim time %s", (start) => {
    const ambient = { ...settings.ambient, all: { start, end: "07:30" } };

    expect(accepts(AccountSettingsSchema, { ...settings, ambient })).toBe(false);
  });

  it("tech§4.5 settings saved with ambientHours parse to the default schedule", () => {
    const { ambient: _, ...rest } = settings;

    const saved = { ...rest, ambientHours: { start: "18:00", end: "07:30" } };

    expect(v.parse(AccountSettingsSchema, saved)).toEqual({ ...rest, ambient: settings.ambient });
  });

  it("tech§4.5 a settings row that still holds hideBarWhenIdle parses and drops it", () => {
    expect(v.parse(AccountSettingsSchema, { ...settings, hideBarWhenIdle: false })).toEqual(
      settings,
    );
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

  it("LOC-05 accepts a weather location with its IANA time zone", () => {
    const weatherLocation = {
      name: "Portland",
      region: "Oregon",
      lat: 45.52,
      lon: -122.68,
      timeZone: "America/Los_Angeles",
    };

    expect(accepts(AccountSettingsSchema, { ...settings, weatherLocation })).toBe(true);
  });

  it("LOC-05 rejects a weather location with an unknown time zone", () => {
    const weatherLocation = {
      name: "Portland",
      region: "Oregon",
      lat: 45.52,
      lon: -122.68,
      timeZone: "Pacific",
    };

    expect(accepts(AccountSettingsSchema, { ...settings, weatherLocation })).toBe(false);
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

describe("QrVoidRequestSchema", () => {
  it("SIGNIN-15 accepts the code's link and nothing else", () => {
    expect(
      accepts(QrVoidRequestSchema, { url: "https://glance.example.com/api/auth/verify?t=a" }),
    ).toBe(true);
    expect(accepts(QrVoidRequestSchema, { url: "not a link" })).toBe(false);
    expect(accepts(QrVoidRequestSchema, {})).toBe(false);
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
