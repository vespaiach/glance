import { err, ok } from "@/domain/result";
import { FIXTURE_ACCOUNT, FIXTURE_SETTINGS, FIXTURE_WEATHER } from "@/fixtures/data";
import {
  CURSOR_KEY,
  deleteGlanceDb,
  type GlanceDb,
  type OutboxEntry,
  openGlanceDb,
  type StoredEvent,
  type StoredPhoto,
  type StoredSettings,
  type StoredTag,
} from "../db";
import { createSyncEngine } from "./engine";
import { STATUS_KEY, type SyncStatus } from "./status";
import type { Change, PullResponse, Transport, TransportError } from "./transport";

const DB_NAME = "glance-engine-test";

const NOW = new Date("2026-10-09T17:41:00.000Z");

const MINUTE = 60_000;

const ACCOUNT_ID = FIXTURE_ACCOUNT.id;

const EVENT: StoredEvent = {
  id: "0195f0a0-0000-7000-8000-000000000101",
  startAt: "2026-10-09T15:00:00.000Z",
  title: "Soccer practice",
  everyone: true,
  tagIds: [],
  notify: true,
  updatedAt: "2026-10-09T10:00:00.000Z",
  version: 1,
};

const MEMBER: StoredTag = {
  id: "0195f0a0-0000-7000-8000-000000000301",
  name: "Mom",
  color: "coral",
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
  version: 1,
};

const OTHER_EVENT: StoredEvent = {
  ...EVENT,
  id: "0195f0a0-0000-7000-8000-000000000102",
  title: "Piano",
};

const SETTINGS: StoredSettings = {
  ...FIXTURE_SETTINGS,
  accountId: ACCOUNT_ID,
  updatedAt: EVENT.updatedAt,
  version: 1,
};

const { weatherLocation: LOCATION, ...NO_LOCATION } = SETTINGS;

const PHOTO: StoredPhoto = {
  id: "0195f0a0-0000-7000-8000-000000000201",
  title: "Cannon Beach",
  takenOn: "2026-09-12",
  sources: { title: "photo", takenOn: "photo", place: "photo-location" },
  checked: true,
  createdAt: "2026-09-13T10:00:00.000Z",
  updatedAt: "2026-09-13T10:00:00.000Z",
  version: 1,
};

const OTHER_PHOTO: StoredPhoto = { ...PHOTO, id: "0195f0a0-0000-7000-8000-000000000202" };

const DELETED_PHOTO: StoredPhoto = {
  ...PHOTO,
  id: "0195f0a0-0000-7000-8000-000000000203",
  deletedAt: "2026-10-01T10:00:00.000Z",
};

let db: GlanceDb;

beforeEach(() => {
  db = openGlanceDb(DB_NAME);
});

afterEach(async () => {
  vi.useRealTimers();
  db.close();
  await deleteGlanceDb(DB_NAME);
});

function stamped(row: StoredEvent, version: number): StoredEvent {
  return { ...row, updatedAt: NOW.toISOString(), version };
}

function answerPut(entry: OutboxEntry) {
  return ok({ entity: "events", row: stamped(entry.payload as StoredEvent, 9) } as Change);
}

function pulled(changes: Change[] = [], cursor = "c2"): PullResponse {
  return { cursor, changes };
}

function fakeTransport(overrides: Partial<Transport> = {}) {
  return {
    push: vi.fn(async (entry: OutboxEntry) => answerPut(entry)),
    pull: vi.fn(async (_cursor: string | undefined) => ok(pulled())),
    weather: vi.fn(async () => ok(FIXTURE_WEATHER)),
    places: vi.fn(),
    auth: { link: vi.fn(), status: vi.fn(), name: vi.fn(), signout: vi.fn() },
    upload: vi.fn(),
    ...overrides,
  } as unknown as Transport & {
    push: ReturnType<typeof vi.fn>;
    pull: ReturnType<typeof vi.fn>;
    weather: ReturnType<typeof vi.fn>;
  };
}

function engine(transport: Transport, photosChanged?: (ids: string[]) => void) {
  return createSyncEngine({ db, transport, accountId: ACCOUNT_ID, now: () => NOW, photosChanged });
}

async function queuePut(row: StoredEvent) {
  await db.events.put(row);

  await db.outbox.add({
    entity: "events",
    entityId: row.id,
    op: "put",
    payload: row,
    attempts: 0,
  } as OutboxEntry);
}

async function queueSettings(row: StoredSettings) {
  await db.settings.put(row);

  await db.outbox.add({
    entity: "settings",
    entityId: row.accountId,
    op: "put",
    payload: row,
    attempts: 0,
  } as OutboxEntry);
}

async function status(): Promise<SyncStatus | undefined> {
  return (await db.meta.get(STATUS_KEY))?.value as SyncStatus | undefined;
}

function failedUntil(minutes: number) {
  return { state: "failed", retryAt: new Date(NOW.getTime() + minutes * MINUTE).toISOString() };
}

function useTimers() {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
}

describe("push", () => {
  it("SYNC-02 sends outbox entries one at a time in seq order", async () => {
    const order: string[] = [];

    let inFlight = 0;

    const transport = fakeTransport({
      push: vi.fn(async (entry: OutboxEntry) => {
        inFlight += 1;

        expect(inFlight).toBe(1);

        order.push((entry.payload as StoredEvent).title);

        await Promise.resolve();

        inFlight -= 1;

        return answerPut(entry);
      }),
    });

    await queuePut(EVENT);
    await queuePut(OTHER_EVENT);
    await queuePut({ ...EVENT, title: "Soccer moved" });

    expect((await engine(transport).nudge()).ok).toBe(true);

    expect(order).toEqual(["Soccer practice", "Piano", "Soccer moved"]);
    expect(await db.outbox.count()).toBe(0);
  });

  it("SYNC-02 removes the entry and saves the row the server answers", async () => {
    const transport = fakeTransport();

    await queuePut(EVENT);

    await engine(transport).nudge();

    expect(await db.outbox.count()).toBe(0);
    expect(await db.events.get(EVENT.id)).toEqual(stamped(EVENT, 9));
  });

  it("SYNC-02 a push answer doesn't overwrite a row edited again during the request", async () => {
    const edited = { ...EVENT, title: "Soccer at the park" };

    const localBeforePush: (StoredEvent | undefined)[] = [];

    const transport = fakeTransport({
      push: vi.fn(async (entry: OutboxEntry) => {
        localBeforePush.push(await db.events.get(EVENT.id));

        if ((entry.payload as StoredEvent).title === EVENT.title) await queuePut(edited);

        return answerPut(entry);
      }),
    });

    await queuePut(EVENT);

    await engine(transport).nudge();

    expect(localBeforePush).toEqual([EVENT, edited]);
    expect(await db.events.get(EVENT.id)).toEqual(stamped(edited, 9));
  });

  it("SYNC-03 delete wins: a tombstone answered to a put is saved", async () => {
    const tombstone = { ...stamped(EVENT, 9), deletedAt: NOW.toISOString() };

    const transport = fakeTransport({
      push: vi.fn(async () => ok({ entity: "events", row: tombstone } as Change)),
    });

    await queuePut({ ...EVENT, title: "Edited elsewhere" });

    await engine(transport).nudge();

    expect(await db.events.get(EVENT.id)).toEqual(tombstone);
  });

  it("D24 a tag answered under another id moves this screen's events and their pushes to it", async () => {
    const local: StoredTag = { ...MEMBER, id: "0195f0a0-0000-7000-8000-000000000399", version: 0 };
    const event = { ...EVENT, everyone: false, tagIds: [local.id] };
    const pushed: OutboxEntry[] = [];
    const transport = fakeTransport({
      push: vi.fn(async (entry: OutboxEntry) => {
        pushed.push(entry);

        return entry.entity === "tags"
          ? ok({ entity: "tags", row: MEMBER } as Change)
          : answerPut(entry);
      }),
    });
    await db.tags.put(local);
    await db.outbox.add({
      entity: "tags",
      entityId: local.id,
      op: "put",
      payload: local,
      attempts: 0,
    } as OutboxEntry);
    await queuePut(event);

    await engine(transport).nudge();

    expect(await db.tags.get(local.id)).toBeUndefined();
    expect(await db.tags.get(MEMBER.id)).toEqual(MEMBER);
    expect(pushed[1]?.payload).toMatchObject({ tagIds: [MEMBER.id] });
    expect((await db.events.get(EVENT.id))?.tagIds).toEqual([MEMBER.id]);
  });

  it("tech§4.6 overlapping nudges never push an entry twice", async () => {
    const transport = fakeTransport();

    await queuePut(EVENT);

    const sync = engine(transport);

    await Promise.all([sync.nudge(), sync.nudge(), sync.nudge()]);

    expect(transport.push).toHaveBeenCalledTimes(1);
  });
});

describe("push errors", () => {
  it("tech§5 400 drops the entry, removes the local row and pulls from scratch", async () => {
    const transport = fakeTransport({ push: vi.fn(async () => err<TransportError>("invalid")) });

    transport.pull.mockImplementation(async (cursor: string | undefined) =>
      ok(cursor === undefined ? pulled([{ entity: "events", row: OTHER_EVENT }]) : pulled()),
    );

    await db.meta.put({ key: CURSOR_KEY, value: "c1" });
    await queuePut(EVENT);

    const result = await engine(transport).nudge();

    expect(result.ok).toBe(true);
    expect(await db.outbox.count()).toBe(0);
    expect(await db.events.get(EVENT.id)).toBeUndefined();
    expect(transport.pull).toHaveBeenCalledWith(undefined);
    expect(await db.events.get(OTHER_EVENT.id)).toEqual(OTHER_EVENT);
  });

  it.each(["unauthorized", "revoked", "outdated"] as const)(
    "tech§5 %s keeps the outbox unsent, records the error and stops syncing",
    async (error) => {
      const transport = fakeTransport({ push: vi.fn(async () => err<TransportError>(error)) });

      await queuePut(EVENT);

      const sync = engine(transport);

      expect(await sync.nudge()).toEqual({ ok: false, error });

      expect(await db.outbox.count()).toBe(1);
      expect((await status())?.error).toBe(error);
      expect(transport.pull).not.toHaveBeenCalled();

      await sync.nudge();
      await sync.refreshWeather();

      expect(transport.push).toHaveBeenCalledTimes(1);
      expect(transport.weather).not.toHaveBeenCalled();
    },
  );

  it("tech§5 a network error keeps the entry, counts the attempt and retries on the next nudge", async () => {
    const transport = fakeTransport();

    transport.push.mockImplementationOnce(async () => err<TransportError>("network"));

    await queuePut(EVENT);

    const sync = engine(transport);

    expect(await sync.nudge()).toEqual({ ok: false, error: "network" });

    expect(await db.outbox.toArray()).toEqual([expect.objectContaining({ attempts: 1 })]);
    expect((await status())?.online).toBe(false);

    expect((await sync.nudge()).ok).toBe(true);

    expect(await db.outbox.count()).toBe(0);
    expect((await status())?.online).toBe(true);
  });

  it("tech§5 a 5xx keeps the entry, records the server error and still pulls", async () => {
    const transport = fakeTransport({ push: vi.fn(async () => err<TransportError>("server")) });

    await queuePut(EVENT);

    await engine(transport).nudge();

    expect(await db.outbox.count()).toBe(1);
    expect((await status())?.error).toBe("server");
    expect(transport.pull).toHaveBeenCalled();
  });
});

describe("pull", () => {
  it("SYNC-02 applies the changed rows, saves the cursor and records the sync", async () => {
    const transport = fakeTransport();

    transport.pull.mockImplementation(async () =>
      ok(
        pulled(
          [
            { entity: "events", row: EVENT },
            { entity: "settings", row: SETTINGS },
          ],
          "c7",
        ),
      ),
    );

    await db.meta.put({ key: CURSOR_KEY, value: "c6" });

    await engine(transport).nudge();

    expect(transport.pull).toHaveBeenCalledWith("c6");
    expect(await db.events.get(EVENT.id)).toEqual(EVENT);
    expect(await db.settings.get(ACCOUNT_ID)).toEqual(SETTINGS);
    expect(await db.meta.get(CURSOR_KEY)).toEqual({ key: CURSOR_KEY, value: "c7" });
    expect(await status()).toMatchObject({ online: true, lastSyncedAt: NOW.toISOString() });
  });

  it("SYNC-01 applies pulled tags", async () => {
    const transport = fakeTransport();

    transport.pull.mockImplementation(async () => ok(pulled([{ entity: "tags", row: MEMBER }])));

    await engine(transport).nudge();

    expect(await db.tags.get(MEMBER.id)).toEqual(MEMBER);
  });

  it("SYNC-02 a pull never overwrites a row that still has an outbox entry", async () => {
    const local = { ...EVENT, title: "Local edit" };

    const transport = fakeTransport({ push: vi.fn(async () => err<TransportError>("server")) });

    transport.pull.mockImplementation(async () =>
      ok(pulled([{ entity: "events", row: { ...EVENT, title: "Server copy", version: 5 } }])),
    );

    await queuePut(local);

    await engine(transport).nudge();

    expect(await db.events.get(EVENT.id)).toEqual(local);
  });

  it("SYNC-03 a pulled tombstone is kept as a deleted row", async () => {
    const tombstone = { ...EVENT, deletedAt: NOW.toISOString(), version: 4 };

    const transport = fakeTransport();

    transport.pull.mockImplementation(async () =>
      ok(pulled([{ entity: "events", row: tombstone }])),
    );

    await db.events.put(EVENT);

    await engine(transport).nudge();

    expect(await db.events.get(EVENT.id)).toEqual(tombstone);
  });

  it("tech§4.6 resync pulls from scratch", async () => {
    const transport = fakeTransport();

    await db.meta.put({ key: CURSOR_KEY, value: "c6" });

    await engine(transport).resync();

    expect(transport.pull).toHaveBeenCalledWith(undefined);
  });

  it("FAIL-02 a failed pull keeps the last sync time", async () => {
    const transport = fakeTransport();

    const sync = engine(transport);

    await sync.nudge();

    transport.pull.mockImplementation(async () => err<TransportError>("network"));

    expect(await sync.nudge()).toEqual({ ok: false, error: "network" });

    expect(await status()).toMatchObject({ online: false, lastSyncedAt: NOW.toISOString() });
  });
});

describe("sync retries", () => {
  it("FAIL-03 a failed sync retries after 1, 2 and 5 min, then every 5 min", async () => {
    useTimers();

    const transport = fakeTransport({ pull: vi.fn(async () => err<TransportError>("server")) });

    const sync = engine(transport);

    await sync.nudge();

    expect((await status())?.retryAt).toBe(failedUntil(1).retryAt);

    for (const [minutes, calls, next] of [
      [1, 2, 2],
      [2, 3, 5],
      [5, 4, 5],
    ] as const) {
      await vi.advanceTimersByTimeAsync(minutes * MINUTE - 1);

      expect(transport.pull).toHaveBeenCalledTimes(calls - 1);

      await vi.advanceTimersByTimeAsync(1);

      await vi.waitFor(async () => {
        expect(transport.pull).toHaveBeenCalledTimes(calls);
        expect((await status())?.retryAt).toBe(failedUntil(next).retryAt);
      });
    }

    sync.stop();
  });

  it("FAIL-03 a sync that works clears the retry and resets the schedule", async () => {
    useTimers();

    const transport = fakeTransport();

    transport.pull.mockImplementationOnce(async () => err<TransportError>("network"));

    const sync = engine(transport);

    await sync.nudge();
    await vi.advanceTimersByTimeAsync(MINUTE);

    await vi.waitFor(async () => {
      expect(transport.pull).toHaveBeenCalledTimes(2);
      expect((await status())?.retryAt).toBeUndefined();
    });

    transport.pull.mockImplementationOnce(async () => err<TransportError>("network"));

    await sync.nudge();

    expect((await status())?.retryAt).toBe(failedUntil(1).retryAt);

    sync.stop();
  });

  it("tech§5 retrying is true while a failed sync waits for its retry", async () => {
    useTimers();

    const transport = fakeTransport();

    transport.pull.mockImplementationOnce(async () => err<TransportError>("network"));

    const sync = engine(transport);

    expect(sync.retrying()).toBe(false);

    await sync.nudge();

    expect(sync.retrying()).toBe(true);

    await vi.advanceTimersByTimeAsync(MINUTE);

    await vi.waitFor(() => expect(transport.pull).toHaveBeenCalledTimes(2));

    expect(sync.retrying()).toBe(false);

    sync.stop();
  });

  it("tech§5 a 401 halts without scheduling a retry", async () => {
    useTimers();

    const transport = fakeTransport({
      pull: vi.fn(async () => err<TransportError>("unauthorized")),
    });

    await engine(transport).nudge();

    await vi.advanceTimersByTimeAsync(10 * MINUTE);

    expect(transport.pull).toHaveBeenCalledTimes(1);
    expect((await status())?.retryAt).toBeUndefined();
  });
});

describe("weather", () => {
  it("LOAD-03 a fetch records when it started loading", async () => {
    await db.settings.put(SETTINGS);

    const transport = fakeTransport({ weather: vi.fn(() => new Promise<never>(() => {})) });

    void engine(transport).refreshWeather();

    await vi.waitFor(async () =>
      expect((await status())?.weather).toEqual({ state: "loading", since: NOW.toISOString() }),
    );
  });

  it("WX-06 start syncs, saves the forecast under the account and refreshes every 15 min", async () => {
    useTimers();

    await db.settings.put(SETTINGS);

    const transport = fakeTransport();

    const sync = engine(transport);

    await sync.start();

    expect(transport.pull).toHaveBeenCalledTimes(1);
    expect(await db.weather.get(ACCOUNT_ID)).toEqual({ ...FIXTURE_WEATHER, accountId: ACCOUNT_ID });
    expect((await status())?.weather).toEqual({ state: "idle" });

    await vi.advanceTimersByTimeAsync(15 * MINUTE - 1);

    expect(transport.weather).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);

    await vi.waitFor(() => expect(transport.weather).toHaveBeenCalledTimes(2));

    sync.stop();
  });

  it("WX-06 skips the fetch while no location is set", async () => {
    await db.settings.put(NO_LOCATION);

    const transport = fakeTransport();

    expect((await engine(transport).refreshWeather()).ok).toBe(true);

    expect(transport.weather).not.toHaveBeenCalled();
  });

  it("FAIL-03 a failed fetch retries after 1, 2 and 5 min, then every 5 min", async () => {
    useTimers();

    await db.settings.put(SETTINGS);

    const transport = fakeTransport({ weather: vi.fn(async () => err<TransportError>("server")) });

    const sync = engine(transport);

    expect(await sync.refreshWeather()).toEqual({ ok: false, error: "server" });

    expect((await status())?.weather).toEqual(failedUntil(1));

    for (const [minutes, calls, next] of [
      [1, 2, 2],
      [2, 3, 5],
      [5, 4, 5],
      [5, 5, 5],
    ] as const) {
      await vi.advanceTimersByTimeAsync(minutes * MINUTE - 1);

      expect(transport.weather).toHaveBeenCalledTimes(calls - 1);

      await vi.advanceTimersByTimeAsync(1);

      await vi.waitFor(async () => {
        expect(transport.weather).toHaveBeenCalledTimes(calls);
        expect((await status())?.weather).toEqual(failedUntil(next));
      });
    }

    sync.stop();
  });

  it("FAIL-03 a fetch after failures resets the retry schedule", async () => {
    useTimers();

    await db.settings.put(SETTINGS);

    const transport = fakeTransport();

    transport.weather.mockImplementationOnce(async () => err<TransportError>("network"));

    const sync = engine(transport);

    await sync.refreshWeather();
    await vi.advanceTimersByTimeAsync(MINUTE);

    await vi.waitFor(async () => {
      expect(transport.weather).toHaveBeenCalledTimes(2);
      expect((await status())?.weather).toEqual({ state: "idle" });
    });

    transport.weather.mockImplementationOnce(async () => err<TransportError>("network"));

    await sync.refreshWeather();

    expect((await status())?.weather).toEqual(failedUntil(1));

    sync.stop();
  });

  it("tech§4.6 a pulled settings row with a new location refreshes weather right away", async () => {
    await db.settings.put(NO_LOCATION);

    const transport = fakeTransport();

    transport.pull.mockImplementation(async () =>
      ok(pulled([{ entity: "settings", row: { ...SETTINGS, weatherLocation: LOCATION } }])),
    );

    const sync = engine(transport);

    await sync.nudge();

    expect(transport.weather).toHaveBeenCalledTimes(1);

    sync.stop();
  });

  it("tech§4.6 a pulled settings row with the same location doesn't refetch", async () => {
    await db.settings.put(SETTINGS);

    const transport = fakeTransport();

    const sync = engine(transport);

    await sync.start();

    transport.pull.mockImplementation(async () =>
      ok(pulled([{ entity: "settings", row: { ...SETTINGS, clock: "24h", version: 2 } }])),
    );

    await sync.nudge();

    expect(transport.weather).toHaveBeenCalledTimes(1);

    sync.stop();
  });

  it("WX-09 a location saved on this screen refreshes weather once its push is accepted", async () => {
    await db.settings.put(NO_LOCATION);

    const transport = fakeTransport({
      push: vi.fn(async (entry: OutboxEntry) =>
        ok({ entity: "settings", row: entry.payload } as Change),
      ),
    });

    const sync = engine(transport);

    await sync.start();

    expect(transport.weather).not.toHaveBeenCalled();

    await queueSettings(SETTINGS);

    await sync.nudge();

    expect(transport.push).toHaveBeenCalledTimes(1);
    expect(transport.weather).toHaveBeenCalledTimes(1);

    sync.stop();
  });

  it("tech§4.6 a location still waiting to push doesn't refresh weather", async () => {
    await db.settings.put(NO_LOCATION);

    const transport = fakeTransport({ push: vi.fn(async () => err<TransportError>("network")) });

    const sync = engine(transport);

    await sync.start();

    await queueSettings(SETTINGS);

    await sync.nudge();

    expect(transport.weather).not.toHaveBeenCalled();

    sync.stop();
  });

  it("tech§4.6 stop cancels the scheduled refresh", async () => {
    useTimers();

    await db.settings.put(SETTINGS);

    const transport = fakeTransport();

    const sync = engine(transport);

    await sync.refreshWeather();

    sync.stop();

    await vi.advanceTimersByTimeAsync(30 * MINUTE);

    expect(transport.weather).toHaveBeenCalledTimes(1);
  });
});

describe("photo warming", () => {
  it("tech§4.5 a pull reports the live photos it brought in", async () => {
    const transport = fakeTransport();

    transport.pull.mockImplementation(async () =>
      ok(
        pulled([
          { entity: "photos", row: PHOTO },
          { entity: "events", row: EVENT },
          { entity: "photos", row: DELETED_PHOTO },
        ]),
      ),
    );

    const photosChanged = vi.fn();

    await engine(transport, photosChanged).nudge();

    expect(photosChanged).toHaveBeenCalledExactlyOnceWith([PHOTO.id]);
  });

  it("tech§4.5 a pull with no new photo reports nothing", async () => {
    const transport = fakeTransport();

    transport.pull.mockImplementation(async () => ok(pulled([{ entity: "events", row: EVENT }])));

    const photosChanged = vi.fn();

    await engine(transport, photosChanged).nudge();

    expect(photosChanged).not.toHaveBeenCalled();
  });

  it("OFF-06 start reports every live photo already saved, once synced", async () => {
    await db.photos.bulkPut([PHOTO, OTHER_PHOTO, DELETED_PHOTO]);

    const photosChanged = vi.fn();

    await engine(fakeTransport(), photosChanged).start();

    expect(photosChanged).toHaveBeenCalledExactlyOnceWith([PHOTO.id, OTHER_PHOTO.id]);
  });
});
