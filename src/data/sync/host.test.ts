import { FIXTURE_ACCOUNT } from "@/fixtures/data";
import { deleteGlanceDb, type GlanceDb, openGlanceDb } from "../db";
import { createWorkerSyncHost } from "./host";
import type { PageCallbacks } from "./worker";

const DB_NAME = "glance-host-test";

let db: GlanceDb;

beforeEach(() => {
  db = openGlanceDb(DB_NAME);
});

afterEach(async () => {
  db.close();
  await deleteGlanceDb(DB_NAME);
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
