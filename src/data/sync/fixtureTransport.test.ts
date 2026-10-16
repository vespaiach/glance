import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { MAX_PHOTO_BYTES } from "@/domain/photoUpload";
import type { CalendarEvent, Note } from "@/domain/schemas";
import { dateKey } from "@/domain/zone";
import {
  FIXTURE_ACCOUNT,
  FIXTURE_ALL_DAY,
  FIXTURE_AMBIENT_NOW,
  FIXTURE_AMBIENT_WEATHER,
  FIXTURE_EVENTS,
  FIXTURE_LOCATED_PLACE,
  FIXTURE_MANY_EVENTS,
  FIXTURE_NOTES,
  FIXTURE_NOW,
  FIXTURE_PHOTOS,
  FIXTURE_SAVED_AT,
  FIXTURE_SEEDED_EVENTS,
  FIXTURE_SETTINGS,
  FIXTURE_TIME_ZONE,
  FIXTURE_WEATHER,
  fixtureScreens,
} from "@/fixtures/data";
import type { FixtureParams } from "@/fixtures/params";
import { CURSOR_KEY, deleteGlanceDb, type GlanceDb, openGlanceDb } from "../db";
import { createFixtureTransport, FIXTURE_CURSOR, seedFixtureDb } from "./fixtureTransport";
import { STATUS_KEY } from "./status";

const DB_NAME = "glance-fixture-transport-test";

const NOW = new Date("2026-10-09T17:41:00.000Z");

const NEVER = Symbol("never");

const NOTE = FIXTURE_NOTES[0] as Note;

const LUNCH = FIXTURE_EVENTS[2] as CalendarEvent;

let db: GlanceDb;

beforeEach(() => {
  db = openGlanceDb(DB_NAME);
});

afterEach(async () => {
  vi.useRealTimers();
  db.close();
  await deleteGlanceDb(DB_NAME);
});

function transport(params: FixtureParams = {}) {
  return createFixtureTransport({ db, params, now: () => NOW });
}

function useTimers() {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
}

async function settleWithin<T>(promise: Promise<T>, ms: number): Promise<T | typeof NEVER> {
  const timeout = new Promise<typeof NEVER>((resolve) => setTimeout(() => resolve(NEVER), ms));

  return Promise.race([promise, timeout]);
}

function photoFile(name: string, size = 1000, type = "image/jpeg") {
  return new File([new Uint8Array(size)], name, { type });
}

describe("seedFixtureDb", () => {
  it("tech§4.2 seeds Appendix A rows with server fields and marks the store synced", async () => {
    await seedFixtureDb(db, {});

    const events = await db.events.toArray();

    expect(events.map(({ id, startAt, title }) => ({ id, startAt, title }))).toEqual(
      expect.arrayContaining(
        FIXTURE_SEEDED_EVENTS.map(({ id, startAt, title }) => ({ id, startAt, title })),
      ),
    );
    expect(events).toHaveLength(FIXTURE_SEEDED_EVENTS.length);
    expect(events[0]).toMatchObject({ updatedAt: FIXTURE_NOW.toISOString(), version: 1 });
    expect(await db.notes.count()).toBe(FIXTURE_NOTES.length);
    expect(await db.photos.count()).toBe(FIXTURE_PHOTOS.length);
    expect(await db.settings.get(FIXTURE_ACCOUNT.id)).toMatchObject(FIXTURE_SETTINGS);
    expect(await db.weather.get(FIXTURE_ACCOUNT.id)).toMatchObject(FIXTURE_WEATHER);
    expect(await db.meta.get(CURSOR_KEY)).toEqual({ key: CURSOR_KEY, value: FIXTURE_CURSOR });
  });

  it("EVT-08 the fixture always seeds No school on the 16th, and allday=1 adds Grandpa on the 9th", async () => {
    await seedFixtureDb(db, {});

    expect(await db.events.get(FIXTURE_ALL_DAY.noSchool.id)).toMatchObject(
      FIXTURE_ALL_DAY.noSchool,
    );
    expect(await db.events.get(FIXTURE_ALL_DAY.grandpa.id)).toBeUndefined();

    await seedFixtureDb(db, { allday: true });

    expect(await db.events.get(FIXTURE_ALL_DAY.grandpa.id)).toMatchObject(FIXTURE_ALL_DAY.grandpa);
  });

  it("TODAY-11 events=many adds four evening events, so Oct 9 has 9", async () => {
    await seedFixtureDb(db, { events: "many" });

    const day = (await db.events.toArray()).filter(
      (event) =>
        !event.allDay && dateKey(new Date(event.startAt), FIXTURE_TIME_ZONE) === "2026-10-09",
    );

    expect(FIXTURE_MANY_EVENTS.map((event) => event.title)).toEqual([
      "Grocery pickup",
      "Family dinner",
      "Piano practice — Mia",
      "Bedtime story",
    ]);
    expect(day).toHaveLength(9);
  });

  it("tech§4.1 reseeding replaces rows and pending writes from an earlier load", async () => {
    await seedFixtureDb(db, {});
    await db.notes.update(NOTE.id, { text: "Edited" });
    await db.outbox.add({
      entity: "notes",
      entityId: NOTE.id,
      op: "put",
      attempts: 0,
    } as never);

    await seedFixtureDb(db, {});

    expect((await db.notes.get(NOTE.id))?.text).toBe(NOTE.text);
    expect(await db.outbox.count()).toBe(0);
  });

  it("TODAY-06 empty=1 seeds no events, notes or photos and settings with no weather location", async () => {
    await seedFixtureDb(db, { empty: true });

    expect(await db.events.count()).toBe(0);
    expect(await db.notes.count()).toBe(0);
    expect(await db.photos.count()).toBe(0);
    expect(await db.weather.count()).toBe(0);
    expect(await db.settings.get(FIXTURE_ACCOUNT.id)).toMatchObject(DEFAULT_SETTINGS);
    expect((await db.settings.get(FIXTURE_ACCOUNT.id))?.weatherLocation).toBeUndefined();
    expect(await db.meta.get(CURSOR_KEY)).toBeDefined();
  });

  it("LOAD-02 net=loading seeds nothing and leaves the store never synced", async () => {
    await seedFixtureDb(db, {});

    await seedFixtureDb(db, { net: "loading" });

    expect(await db.events.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);
    expect(await db.meta.get(CURSOR_KEY)).toBeUndefined();
  });

  it("FAIL-01 net=wxerror seeds everything except the saved forecast", async () => {
    await seedFixtureDb(db, { net: "wxerror" });

    expect(await db.events.count()).toBe(FIXTURE_SEEDED_EVENTS.length);
    expect(await db.weather.count()).toBe(0);
  });

  it("BG-03 bg=photo seeds the Appendix A background in Photo mode", async () => {
    await seedFixtureDb(db, { bg: "photo" });

    expect((await db.settings.get(FIXTURE_ACCOUNT.id))?.background).toEqual({
      ...FIXTURE_SETTINGS.background,
      mode: "photo",
    });
  });

  it("BG-06 bg=photo also applies with wx=, so the setup card shows on the photo", async () => {
    await seedFixtureDb(db, { bg: "photo", wx: "searching" });

    const settings = await db.settings.get(FIXTURE_ACCOUNT.id);

    expect(settings?.background.mode).toBe("photo");
    expect(settings?.weatherLocation).toBeUndefined();
  });

  it("SET-09 wx= on the Location page keeps the saved place", async () => {
    await seedFixtureDb(db, { wx: "choose", keepPlace: true });

    expect((await db.settings.get(FIXTURE_ACCOUNT.id))?.weatherLocation).toEqual(
      FIXTURE_SETTINGS.weatherLocation,
    );
  });

  it.each([
    ["split", { ...FIXTURE_SETTINGS.ambient, mode: "split" }],
    ["off", { ...FIXTURE_SETTINGS.ambient, mode: "off" }],
    ["same", { ...FIXTURE_SETTINGS.ambient, all: { start: "18:00", end: "18:00" } }],
  ] as const)("SET-10 amb=%s seeds that ambient schedule", async (amb, ambient) => {
    await seedFixtureDb(db, { amb });

    expect((await db.settings.get(FIXTURE_ACCOUNT.id))?.ambient).toEqual(ambient);
  });

  it("SET-11 barauto=off seeds Hide bar when idle Off", async () => {
    await seedFixtureDb(db, { barauto: "off" });

    expect((await db.settings.get(FIXTURE_ACCOUNT.id))?.hideBarWhenIdle).toBe(false);
  });

  it("SET-11 the fixture hides the bar when idle by default", async () => {
    await seedFixtureDb(db, {});

    expect((await db.settings.get(FIXTURE_ACCOUNT.id))?.hideBarWhenIdle).toBe(true);
  });

  it("AMB-03 now= during ambient hours seeds the Appendix A ambient forecast", async () => {
    await seedFixtureDb(db, { now: FIXTURE_AMBIENT_NOW });

    expect(await db.weather.get(FIXTURE_ACCOUNT.id)).toEqual({
      ...FIXTURE_AMBIENT_WEATHER,
      accountId: FIXTURE_ACCOUNT.id,
    });
  });

  it("OFF-01 net=offline seeds an offline status saved at 9:32 and the forecast from then", async () => {
    await seedFixtureDb(db, { net: "offline" });

    expect((await db.meta.get(STATUS_KEY))?.value).toEqual({
      online: false,
      lastSyncedAt: FIXTURE_SAVED_AT,
      weather: { state: "idle" },
    });
    expect((await db.weather.get(FIXTURE_ACCOUNT.id))?.fetchedAt).toBe(FIXTURE_SAVED_AT);
    expect(await db.events.count()).toBe(FIXTURE_SEEDED_EVENTS.length);
  });

  it("PHOTO-09 upload=offline seeds the same offline status", async () => {
    await seedFixtureDb(db, { upload: "offline" });

    expect((await db.meta.get(STATUS_KEY))?.value).toMatchObject({
      online: false,
      lastSyncedAt: FIXTURE_SAVED_AT,
    });
  });

  it.each(["photo", "photometa"] as const)(
    "PHOTO-12 sheet=%s seeds the two uploaded photos with their file names",
    async (sheet) => {
      await seedFixtureDb(db, { sheet });

      const newest = await db.photos.orderBy("createdAt").reverse().limit(2).toArray();

      expect(newest.map((photo) => photo.fileName)).toEqual([
        "halloween-costumes-2025-10-31.jpg",
        "IMG_4410.JPG",
      ]);
    },
  );

  it("PHOTO-03 upload=done seeds the two uploaded photos, guessed and not checked, newest first", async () => {
    await seedFixtureDb(db, { upload: "done" });

    const newest = await db.photos.orderBy("createdAt").reverse().limit(2).toArray();

    expect(
      newest.map(({ title, takenOn, place, sources, checked }) => ({
        title,
        takenOn,
        place,
        sources,
        checked,
      })),
    ).toEqual([
      {
        title: "Halloween costumes",
        takenOn: "2025-10-31",
        place: undefined,
        sources: { title: "file-name", takenOn: "file-name", place: "none" },
        checked: false,
      },
      {
        title: "Cannon Beach",
        takenOn: "2026-08-16",
        place: "Cannon Beach, OR",
        sources: { title: "place", takenOn: "photo", place: "photo-location" },
        checked: false,
      },
    ]);
    expect(await db.photos.count()).toBe(FIXTURE_PHOTOS.length + 2);
  });

  it("OFF-01 online fixtures seed no sync status", async () => {
    await seedFixtureDb(db, {});

    expect(await db.meta.get(STATUS_KEY)).toBeUndefined();
  });

  it("WX-07 wx= seeds everything except the weather location and the forecast", async () => {
    await seedFixtureDb(db, { wx: "searching" });

    expect(await db.events.count()).toBe(FIXTURE_SEEDED_EVENTS.length);
    expect((await db.settings.get(FIXTURE_ACCOUNT.id))?.weatherLocation).toBeUndefined();
    expect(await db.weather.count()).toBe(0);
  });
});

describe("FixtureTransport pull", () => {
  it("SYNC-02 answers with no changes and the same cursor", async () => {
    expect(await transport().pull(FIXTURE_CURSOR)).toEqual({
      ok: true,
      value: { cursor: FIXTURE_CURSOR, changes: [] },
    });
  });

  it("OFF-01 net=offline fails with a network error", async () => {
    expect(await transport({ net: "offline" }).pull(FIXTURE_CURSOR)).toEqual({
      ok: false,
      error: "network",
    });
  });

  it("SIGNIN-13 signin=ended fails as signed out by the server", async () => {
    expect(await transport({ signin: "ended" }).pull(FIXTURE_CURSOR)).toEqual({
      ok: false,
      error: "unauthorized",
    });
  });

  it("LOAD-02 net=loading never answers", async () => {
    useTimers();

    const result = settleWithin(transport({ net: "loading" }).pull(undefined), 60_000);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(await result).toBe(NEVER);
  });
});

describe("FixtureTransport push", () => {
  it("SYNC-02 accepts a put and returns the row stamped by the server", async () => {
    await seedFixtureDb(db, {});
    const note = { ...NOTE, text: "Edited" };

    const result = await transport().push({
      seq: 1,
      entity: "notes",
      entityId: note.id,
      op: "put",
      payload: note,
      attempts: 0,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        entity: "notes",
        row: { ...note, updatedAt: NOW.toISOString(), version: expect.any(Number) },
      },
    });
  });

  it("SYNC-03 stamps each accepted write with a higher version than the seed", async () => {
    await seedFixtureDb(db, {});
    const fixture = transport();
    const put = (text: string) =>
      fixture.push({
        seq: 1,
        entity: "notes",
        entityId: NOTE.id,
        op: "put",
        payload: { ...NOTE, text },
        attempts: 0,
      });

    const first = await put("One");
    const second = await put("Two");

    const [one = 0, two = 0] = [first, second].map((r) => (r.ok ? r.value.row.version : 0));
    const seeded = (await db.events.toArray()).map((row) => row.version);
    expect(one).toBeGreaterThan(Math.max(...seeded));
    expect(two).toBeGreaterThan(one);
  });

  it("SYNC-03 accepts a delete and returns the stored row as a tombstone", async () => {
    await seedFixtureDb(db, {});
    const event = await db.events.get(LUNCH.id);

    const result = await transport().push({
      seq: 1,
      entity: "events",
      entityId: LUNCH.id,
      op: "delete",
      attempts: 0,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        entity: "events",
        row: {
          ...event,
          deletedAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
          version: expect.any(Number),
        },
      },
    });
  });

  it("tech§5 rejects a delete of a row the server never had as invalid", async () => {
    const result = await transport().push({
      seq: 1,
      entity: "notes",
      entityId: NOTE.id,
      op: "delete",
      attempts: 0,
    });

    expect(result).toEqual({ ok: false, error: "invalid" });
  });

  it("OFF-04 net=offline keeps the write unsent with a network error", async () => {
    const result = await transport({ net: "offline" }).push({
      seq: 1,
      entity: "notes",
      entityId: NOTE.id,
      op: "put",
      payload: NOTE,
      attempts: 0,
    });

    expect(result).toEqual({ ok: false, error: "network" });
  });

  it("SIGNIN-13 signin=ended keeps the write unsent as signed out by the server", async () => {
    const result = await transport({ signin: "ended" }).push({
      seq: 1,
      entity: "notes",
      entityId: NOTE.id,
      op: "put",
      payload: NOTE,
      attempts: 0,
    });

    expect(result).toEqual({ ok: false, error: "unauthorized" });
  });
});

describe("FixtureTransport displays", () => {
  it("SET-12 answers with the four Appendix A screens, this one first, seen relative to now", async () => {
    const answer = await transport().displays();

    expect(answer).toEqual({ ok: true, value: fixtureScreens(NOW) });
    expect(
      fixtureScreens(NOW).map(({ kind, browser, lastSeenAt, current }) => [
        kind,
        browser,
        lastSeenAt,
        current,
      ]),
    ).toEqual([
      ["monitor", "Chrome", "2026-10-09T17:41:00.000Z", true],
      ["monitor", "Edge", "2026-10-09T17:29:00.000Z", false],
      ["tablet", "Safari", "2026-10-08T17:41:00.000Z", false],
      ["smartphone", "Safari", "2026-10-03T01:30:00.000Z", false],
    ]);
  });

  it("SET-12 net=offline fails with a network error", async () => {
    expect(await transport({ net: "offline" }).displays()).toEqual({
      ok: false,
      error: "network",
    });
  });
});

describe("FixtureTransport weather", () => {
  it("WX-01 answers with the Appendix A forecast", async () => {
    expect(await transport().weather()).toEqual({ ok: true, value: FIXTURE_WEATHER });
  });

  it("AMB-03 now= during ambient hours answers with the Appendix A ambient forecast", async () => {
    expect(await transport({ now: FIXTURE_AMBIENT_NOW }).weather()).toEqual({
      ok: true,
      value: FIXTURE_AMBIENT_WEATHER,
    });
  });

  it("AMB-07 signin=ended still answers, as the saved forecast", async () => {
    expect((await transport({ signin: "ended" }).weather()).ok).toBe(true);
  });

  it("FAIL-01 net=wxerror fails as a server error, not offline", async () => {
    expect(await transport({ net: "wxerror" }).weather()).toEqual({ ok: false, error: "server" });
  });

  it("OFF-03 net=offline fails with a network error", async () => {
    expect(await transport({ net: "offline" }).weather()).toEqual({ ok: false, error: "network" });
  });

  it("LOAD-02 net=loading never answers", async () => {
    useTimers();

    const result = settleWithin(transport({ net: "loading" }).weather(), 60_000);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(await result).toBe(NEVER);
  });
});

describe("FixtureTransport places", () => {
  it("WX-07 answers after 1.2 s, not before", async () => {
    useTimers();
    const pending = transport().places("Seattle");

    const early = settleWithin(pending, 1_199);
    await vi.advanceTimersByTimeAsync(1_199);
    expect(await early).toBe(NEVER);

    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({
      ok: true,
      value: [expect.objectContaining({ name: "Seattle", region: "Washington" })],
    });
  });

  it("WX-09 finds two places called Portland and three called Springfield", async () => {
    useTimers();
    const fixture = transport();
    const portland = fixture.places("  portland ");
    const springfield = fixture.places("Springfield");

    await vi.advanceTimersByTimeAsync(1_200);

    const regions = async (pending: typeof portland) => {
      const result = await pending;
      return result.ok ? result.value.map((place) => place.region) : [];
    };
    expect(await regions(portland)).toEqual(["Oregon", "Maine"]);
    expect(await regions(springfield)).toEqual(["Illinois", "Missouri", "Massachusetts"]);
  });

  it("WX-08 finds nothing for an unknown place", async () => {
    useTimers();
    const pending = transport().places("Pordland");

    await vi.advanceTimersByTimeAsync(1_200);

    expect(await pending).toEqual({ ok: true, value: [] });
  });

  it("WX-07 accepts any 5-digit ZIP or a query with a comma as one place", async () => {
    useTimers();
    const fixture = transport();
    const zip = fixture.places("10001");
    const city = fixture.places("Tacoma, WA");

    await vi.advanceTimersByTimeAsync(1_200);

    expect(await zip).toEqual({
      ok: true,
      value: [expect.objectContaining({ name: "10001", region: "" })],
    });
    expect(await city).toEqual({
      ok: true,
      value: [expect.objectContaining({ name: "Tacoma", region: "WA" })],
    });
  });

  it("LOC-05 the ZIP or comma fallback gets the fixture zone", async () => {
    useTimers();
    const fixture = transport();
    const zip = fixture.places("10001");
    const city = fixture.places("Tacoma, WA");

    await vi.advanceTimersByTimeAsync(1_200);

    const zones = async (pending: typeof zip) => {
      const result = await pending;
      return result.ok ? result.value.map((place) => place.timeZone) : [];
    };
    expect(await zones(zip)).toEqual(["America/Los_Angeles"]);
    expect(await zones(city)).toEqual(["America/Los_Angeles"]);
  });

  it("OFF-01 net=offline fails with a network error", async () => {
    expect(await transport({ net: "offline" }).places("Portland")).toEqual({
      ok: false,
      error: "network",
    });
  });
});

describe("FixtureTransport auth", () => {
  it("SIGNIN-03 accepts a link request after 1.4 s, not before", async () => {
    useTimers();
    const pending = transport().auth.link({
      email: "maria@example.com",
      timeZone: "America/Los_Angeles",
    });

    const early = settleWithin(pending, 1_399);
    await vi.advanceTimersByTimeAsync(1_399);
    expect(await early).toBe(NEVER);

    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ ok: true, value: undefined });
  });

  it("SIGNIN-10 signin=offline can't send a link", async () => {
    const result = await transport({ signin: "offline" }).auth.link({
      email: "maria@example.com",
      timeZone: "America/Los_Angeles",
    });

    expect(result).toEqual({ ok: false, error: "network" });
  });

  it("SIGNIN-04 status is waiting until the link is opened", async () => {
    expect(await transport({ signin: "sent" }).auth.status()).toEqual({
      ok: true,
      value: { state: "waiting" },
    });
  });

  it("SIGNIN-07 signin=phone is waiting for the first sign-in to finish elsewhere", async () => {
    expect(await transport({ signin: "phone" }).auth.status()).toEqual({
      ok: true,
      value: { state: "finishing-elsewhere" },
    });
  });

  it("SIGNIN-08 signin=expired reports the link expired", async () => {
    expect(await transport({ signin: "expired" }).auth.status()).toEqual({
      ok: true,
      value: { state: "expired" },
    });
  });

  it("SIGNIN-09 signin=done signs in Maria as a new account", async () => {
    expect(await transport({ signin: "done" }).auth.status()).toEqual({
      ok: true,
      value: { state: "signed-in", account: FIXTURE_ACCOUNT, returning: false, setupDone: true },
    });
  });

  it("SIGNIN-09 signin=done with acct=returning signs Maria back in", async () => {
    expect(await transport({ signin: "done", acct: "returning" }).auth.status()).toEqual({
      ok: true,
      value: { state: "signed-in", account: FIXTURE_ACCOUNT, returning: true, setupDone: true },
    });
  });

  it("SIGNIN-06 saves the trimmed name on the account", async () => {
    expect(await transport().auth.name("  Ana ")).toEqual({
      ok: true,
      value: { ...FIXTURE_ACCOUNT, name: "Ana" },
    });
  });

  it("SIGNIN-14 ends the location step", async () => {
    expect(await transport().auth.location({ skip: true })).toEqual({ ok: true, value: undefined });
  });

  it("SIGNIN-11 signs this screen out", async () => {
    expect(await transport().auth.signout()).toEqual({ ok: true, value: undefined });
  });
});

describe("FixtureTransport upload", () => {
  it("PHOTO-06 reports progress every 400 ms and resolves with the saved photo", async () => {
    useTimers();
    const progress: number[] = [];

    const pending = transport().upload(photoFile("IMG_2041.jpg"), "2026-10-08", (percent) =>
      progress.push(percent),
    );
    await vi.advanceTimersByTimeAsync(400);
    expect(progress).toEqual([8]);

    await vi.advanceTimersByTimeAsync(400 * 12);

    expect(progress).toEqual([8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 100]);
    expect(await pending).toEqual({
      ok: true,
      value: {
        id: expect.any(String),
        title: "IMG_2041",
        takenOn: "2026-10-08",
        createdAt: NOW.toISOString(),
        sources: { title: "file", takenOn: "file-date", place: "none" },
        checked: false,
        updatedAt: NOW.toISOString(),
        version: expect.any(Number),
      },
    });
  });

  it("PHOTO-10 guesses the name and date from the file name", async () => {
    useTimers();

    const pending = transport().upload(
      photoFile("halloween-costumes-2025-10-31.jpg"),
      "2026-10-08",
      () => {},
    );
    await vi.advanceTimersByTimeAsync(400 * 13);

    expect(await pending).toMatchObject({
      ok: true,
      value: {
        title: "Halloween costumes",
        takenOn: "2025-10-31",
        sources: { title: "file-name", takenOn: "file-name", place: "none" },
        checked: false,
      },
    });
  });

  it("PHOTO-08 rejects a file over 20 MB as too large with no progress", async () => {
    const progress: number[] = [];

    const result = await transport().upload(
      photoFile("IMG_3307.jpg", MAX_PHOTO_BYTES + 1),
      "2026-10-08",
      (p) => progress.push(p),
    );

    expect(result).toEqual({ ok: false, error: "too-large" });
    expect(progress).toEqual([]);
  });

  it("PHOTO-08 rejects a file that isn't an image as not a photo", async () => {
    const result = await transport().upload(
      photoFile("Recipe card.pdf", 1000, "application/pdf"),
      "2026-10-08",
      () => {},
    );

    expect(result).toEqual({ ok: false, error: "not-a-photo" });
  });

  it("PHOTO-09 upload=offline fails with a network error", async () => {
    const result = await transport({ upload: "offline" }).upload(
      photoFile("IMG_2041.jpg"),
      "2026-10-08",
      () => {},
    );

    expect(result).toEqual({ ok: false, error: "network" });
  });
});

describe("FixtureTransport locate", () => {
  const AT = { lat: 40.71, lon: -74.01 };

  it("LOC-01 always finds Portland, OR at 2-decimal coordinates after 2.6 s, not before", async () => {
    useTimers();
    const pending = transport().locate(AT);

    const early = settleWithin(pending, 2_599);
    await vi.advanceTimersByTimeAsync(2_599);
    expect(await early).toBe(NEVER);

    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ ok: true, value: FIXTURE_LOCATED_PLACE });
    expect(FIXTURE_LOCATED_PLACE).toEqual({
      name: "Portland",
      region: "Oregon",
      lat: 45.52,
      lon: -122.68,
      timeZone: "America/Los_Angeles",
    });
  });

  it("LOC-03 net=offline fails with a network error", async () => {
    expect(await transport({ net: "offline" }).locate(AT)).toEqual({
      ok: false,
      error: "network",
    });
  });
});
