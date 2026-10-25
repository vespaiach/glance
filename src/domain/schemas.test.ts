import * as v from "valibot";
import {
  AccountSchema,
  AccountSettingsSchema,
  CalendarEventSchema,
  CodeRequestSchema,
  CodeVerifySchema,
  NameRequestSchema,
  NoteSchema,
  PhotoSchema,
  QrVoidRequestSchema,
  type Synced,
  SyncedEventSchema,
  SyncedTagSchema,
  TagColorSchema,
  TagSchema,
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
  tagIds: [],
  notify: true,
};

const tagId = "0192f1a0-7c2e-7a3b-9c4d-1e2f3a4b5c6e";

const tag = {
  id: tagId,
  name: "Minh-An",
  color: "lilac",
  createdAt: "2026-10-01T15:00:00.000Z",
};

const note = {
  id,
  text: "Wi-Fi password is on the fridge!",
  author: "Dad",
  createdAt: "2026-10-09T15:12:00.000Z",
  rotation: -2,
};

const settings = {
  season: "auto",
  clock: "12h",
  tempUnit: "F",
  background: { mode: "season", dim: 0.2, rotate: "daily" },
  idleTimeout: { on: true, minutes: 3 },
  noteExpiry: { on: true, days: 7 },
  hideSidebarWhenIdle: true,
  ambientBrightness: "medium",
  notifyLead: 15,
  chime: true,
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

  it("D24 accepts an event for some tags with its notes", () => {
    const some = { ...event, everyone: false, tagIds: [tagId], notes: "Bring snacks" };

    expect(v.parse(CalendarEventSchema, some)).toEqual(some);
  });

  it("D24 rejects an event for everyone that also names tags", () => {
    expect(accepts(CalendarEventSchema, { ...event, tagIds: [tagId] })).toBe(false);
  });

  it("EVT-11 accepts an event for nobody", () => {
    expect(accepts(CalendarEventSchema, { ...event, everyone: false })).toBe(true);
  });

  it("D24 rejects a tag id that isn't a UUID", () => {
    expect(accepts(CalendarEventSchema, { ...event, everyone: false, tagIds: ["dad"] })).toBe(
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

describe("CalendarEventSchema notify", () => {
  it.each([true, false])("NOTIF-09 accepts the notification %s", (notify) => {
    expect(accepts(CalendarEventSchema, { ...event, notify })).toBe(true);
  });

  it("NOTIF-09 rejects a notification that isn't on or off", () => {
    expect(accepts(CalendarEventSchema, { ...event, notify: "15min" })).toBe(false);
  });

  it("D29 an event stored without a notification parses without one, which reads on", () => {
    const { notify: _, ...stored } = event;

    expect(v.parse(CalendarEventSchema, stored)).toEqual(stored);
  });

  it("D29 drops the old reminder an older client still sends", () => {
    expect(v.parse(CalendarEventSchema, { ...event, reminder: "both" })).toEqual(event);
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

describe("TagSchema", () => {
  it("§7 accepts a tag with a name, a block color and a created time", () => {
    expect(v.parse(TagSchema, tag)).toEqual(tag);
  });

  it("FAM-04 rejects a blank name", () => {
    expect(accepts(TagSchema, { ...tag, name: "  " })).toBe(false);
  });

  it("§7 accepts each of the 12 block colors and nothing else", () => {
    expect(TagColorSchema.options).toEqual([
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
    expect(accepts(TagSchema, { ...tag, color: "navy" })).toBe(false);
  });

  it("D10 a synced tag adds the server fields", () => {
    const row = { ...tag, updatedAt: "2026-10-09T17:00:00.000Z", version: 3 };

    expect(v.parse(SyncedTagSchema, row)).toEqual(row);
  });
});

describe("NoteSchema", () => {
  it("D6 accepts a note", () => {
    expect(accepts(NoteSchema, note)).toBe(true);
  });

  it("D27 drops the tone an older client still sends", () => {
    expect(v.parse(NoteSchema, { ...note, tone: 3 })).toEqual(note);
  });

  it("NOTE-02 accepts a message of 280 characters after trimming", () => {
    expect(accepts(NoteSchema, { ...note, text: ` ${"a".repeat(280)}\n` })).toBe(true);
  });

  it("NOTE-02 rejects a message of 281 characters", () => {
    expect(accepts(NoteSchema, { ...note, text: "a".repeat(281) })).toBe(false);
  });

  it("NOTE-02 accepts an author of 32 characters and rejects 33", () => {
    expect(accepts(NoteSchema, { ...note, author: "a".repeat(32) })).toBe(true);
    expect(accepts(NoteSchema, { ...note, author: "a".repeat(33) })).toBe(false);
  });

  it("NOTE-03 accepts a blank author as unsigned", () => {
    expect(accepts(NoteSchema, { ...note, author: "" })).toBe(true);
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

  it("D28 stored settings without ambientBrightness read as Medium", () => {
    const { ambientBrightness: _, ...stored } = settings;

    expect(v.parse(AccountSettingsSchema, stored).ambientBrightness).toBe("medium");
  });

  it.each(["full", "medium", "low"])("SET-10 accepts the %s brightness", (ambientBrightness) => {
    expect(accepts(AccountSettingsSchema, { ...settings, ambientBrightness })).toBe(true);
  });

  it("SET-10 rejects an unknown brightness", () => {
    expect(accepts(AccountSettingsSchema, { ...settings, ambientBrightness: "dim" })).toBe(false);
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

  it("SET-07 accepts idle and note expiry turned off with their values kept", () => {
    const idleTimeout = { on: false, minutes: 15 };

    const noteExpiry = { on: false, days: 30 };

    expect(accepts(AccountSettingsSchema, { ...settings, idleTimeout, noteExpiry })).toBe(true);
  });

  it.each([0, 16, 2.5])("SET-07 rejects %s idle minutes", (minutes) => {
    const idleTimeout = { on: true, minutes };

    expect(accepts(AccountSettingsSchema, { ...settings, idleTimeout })).toBe(false);
  });

  it.each([0, 31, 1.5])("SET-07 rejects %s note expiry days", (days) => {
    const noteExpiry = { on: true, days };

    expect(accepts(AccountSettingsSchema, { ...settings, noteExpiry })).toBe(false);
  });

  it("SET-07 rejects the old idle and note expiry values", () => {
    expect(accepts(AccountSettingsSchema, { ...settings, idleTimeout: 180 })).toBe(false);
    expect(accepts(AccountSettingsSchema, { ...settings, noteExpiry: "1w" })).toBe(false);
  });

  it("tech§4.5 a settings row without hideSidebarWhenIdle parses with it on", () => {
    const { hideSidebarWhenIdle: _, ...saved } = settings;

    expect(v.parse(AccountSettingsSchema, saved)).toEqual(settings);
  });

  it("NOTIF-08 a settings row without notifyLead and chime reads 15 min with the chime on", () => {
    const { notifyLead: _, chime: __, ...saved } = settings;

    expect(v.parse(AccountSettingsSchema, saved)).toEqual(settings);
  });

  it.each(["off", 15, 30])("NOTIF-08 accepts the %s lead time", (notifyLead) => {
    expect(accepts(AccountSettingsSchema, { ...settings, notifyLead })).toBe(true);
  });

  it.each([0, 60, "15min"])("NOTIF-08 rejects the %s lead time", (notifyLead) => {
    expect(accepts(AccountSettingsSchema, { ...settings, notifyLead })).toBe(false);
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

describe("CodeRequestSchema", () => {
  it("SIGNIN-12 accepts an email and an IANA time zone", () => {
    expect(
      accepts(CodeRequestSchema, { email: "maria@example.com", timeZone: "America/New_York" }),
    ).toBe(true);
  });

  it("SIGNIN-02 rejects an invalid email", () => {
    expect(accepts(CodeRequestSchema, { email: "maria@", timeZone: "America/New_York" })).toBe(
      false,
    );
  });

  it("tech§6.2 rejects a time zone that isn't an IANA name", () => {
    expect(accepts(CodeRequestSchema, { email: "maria@example.com", timeZone: "Mars/Base" })).toBe(
      false,
    );
  });
});

describe("CodeVerifySchema", () => {
  it("SIGNIN-04 accepts an email and six digits, a leading zero included", () => {
    expect(accepts(CodeVerifySchema, { email: "maria@example.com", code: "048291" })).toBe(true);
  });

  it("SIGNIN-04 rejects a code that isn't exactly six digits", () => {
    for (const code of ["48291", "4829130", "48 291", "48291a"]) {
      expect(accepts(CodeVerifySchema, { email: "maria@example.com", code })).toBe(false);
    }
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
