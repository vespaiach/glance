import { FIXTURE_ACCOUNT, FIXTURE_NOTES } from "@/fixtures/data";
import { deleteGlanceDb, type GlanceDb, type OutboxEntry, openGlanceDb } from "../db";
import { createFixtureTransport, seedFixtureDb } from "./fixtureTransport";
import { createInlineSyncHost, createWorkerSyncHost } from "./host";
import { STATUS_KEY } from "./status";
import type { PageCallbacks } from "./worker";

const DB_NAME = "glance-host-test";

const NOW = new Date("2026-10-09T17:41:00.000Z");

const NOTE = FIXTURE_NOTES[0];

let db: GlanceDb;

beforeEach(async () => {
  db = openGlanceDb(DB_NAME);

  await seedFixtureDb(db, {});
});

afterEach(async () => {
  db.close();
  await deleteGlanceDb(DB_NAME);
});

function host() {
  const now = () => NOW;

  return createInlineSyncHost({
    db,
    transport: createFixtureTransport({ db, params: {}, now }),
    now,
  });
}

async function queueNoteEdit() {
  await db.outbox.add({
    entity: "notes",
    entityId: NOTE?.id ?? "",
    op: "put",
    payload: { ...NOTE, text: "Edited" },
    attempts: 0,
  } as OutboxEntry);
}

describe("inline sync host", () => {
  it("tech§4.6 start runs the engine inline and writes the status", async () => {
    const sync = host();

    await sync.start(FIXTURE_ACCOUNT.id);

    expect((await db.meta.get(STATUS_KEY))?.value).toEqual({
      online: true,
      lastSyncedAt: NOW.toISOString(),
      weather: { state: "idle" },
    });

    sync.stop();
  });

  it("tech§4.6 nudge drains the outbox through the transport", async () => {
    const sync = host();

    await sync.start(FIXTURE_ACCOUNT.id);
    await queueNoteEdit();

    await sync.nudge();

    expect(await db.outbox.count()).toBe(0);
    expect((await db.notes.get(NOTE?.id ?? ""))?.text).toBe("Edited");

    sync.stop();
  });

  it("tech§4.6 calls before start do nothing", async () => {
    await queueNoteEdit();

    await host().nudge();

    expect(await db.outbox.count()).toBe(1);
  });
});

function fakeWorker() {
  const api = {
    start: vi.fn(async (_accountId: string, _page: PageCallbacks) => {}),
    nudge: vi.fn(async () => {}),
    resync: vi.fn(async () => {}),
    refreshWeather: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
  };

  return { api, terminate: vi.fn() };
}

function workerHost() {
  const spawned: ReturnType<typeof fakeWorker>[] = [];

  const spawn = () => {
    const worker = fakeWorker();

    spawned.push(worker);

    return worker;
  };

  const photosChanged = vi.fn();

  return { host: createWorkerSyncHost({ db, spawn, photosChanged }), spawned, photosChanged };
}

describe("worker sync host", () => {
  it("D19 start spawns the worker and starts it on the account", async () => {
    const { host, spawned } = workerHost();

    await host.start(FIXTURE_ACCOUNT.id);

    expect(spawned).toHaveLength(1);
    expect(spawned[0]?.api.start).toHaveBeenCalledWith(FIXTURE_ACCOUNT.id, expect.anything());
  });

  it("D19 nudge, resync and refreshWeather reach the worker", async () => {
    const { host, spawned } = workerHost();

    await host.start(FIXTURE_ACCOUNT.id);
    await host.nudge();
    await host.resync();
    await host.refreshWeather();

    const api = spawned[0]?.api;

    expect(api?.nudge).toHaveBeenCalledTimes(1);
    expect(api?.resync).toHaveBeenCalledTimes(1);
    expect(api?.refreshWeather).toHaveBeenCalledTimes(1);
  });

  it("tech§4.6 calls before start or after stop do nothing", async () => {
    const { host, spawned } = workerHost();

    await host.nudge();
    await host.start(FIXTURE_ACCOUNT.id);
    host.stop();
    await host.nudge();

    expect(spawned[0]?.terminate).toHaveBeenCalledTimes(1);
    expect(spawned[0]?.api.nudge).not.toHaveBeenCalled();
  });

  it("tech§4.5 photosChanged from the worker reaches the page's photo warming", async () => {
    const { host, spawned, photosChanged } = workerHost();

    await host.start(FIXTURE_ACCOUNT.id);

    spawned[0]?.api.start.mock.calls[0]?.[1].photosChanged(["p1", "p2"]);

    expect(photosChanged).toHaveBeenCalledExactlyOnceWith(["p1", "p2"]);

    host.stop();
  });

  it("tech§4.6 a restart from the worker respawns it on the same account", async () => {
    const { host, spawned } = workerHost();

    await host.start(FIXTURE_ACCOUNT.id);

    const page = spawned[0]?.api.start.mock.calls[0]?.[1];

    page?.restart();

    await vi.waitFor(() => expect(spawned).toHaveLength(2));

    expect(spawned[0]?.terminate).toHaveBeenCalledTimes(1);
    expect(spawned[1]?.api.start).toHaveBeenCalledWith(FIXTURE_ACCOUNT.id, expect.anything());

    host.stop();
  });
});
