import Dexie from "dexie";
import { err, ok } from "@/domain/result";
import { FIXTURE_ACCOUNT, FIXTURE_WEATHER } from "@/fixtures/data";
import { deleteGlanceDb, type OutboxEntry, openGlanceDb } from "../db";
import type { Transport, TransportError } from "./transport";
import {
  createSyncWorker,
  POLL_MS,
  type StreamHandlers,
  SYNC_STREAM_PATH,
  type SyncWorkerApi,
  type WorkerDeps,
} from "./worker";

const DB_NAME = "glance-worker-test";

const NOW = new Date("2026-10-09T17:41:00.000Z");

const ACCOUNT_ID = FIXTURE_ACCOUNT.id;

type FakeStream = StreamHandlers & { url: string; isOpen: boolean; close: () => void };

let workers: SyncWorkerApi[];

beforeEach(() => {
  workers = [];
});

afterEach(async () => {
  for (const worker of workers) await worker.stop();

  vi.useRealTimers();

  await deleteGlanceDb(DB_NAME);
});

function fakeTransport() {
  return {
    push: vi.fn(async (entry: OutboxEntry) =>
      ok({ entity: "notes", row: { ...(entry.payload as object), version: 2 } }),
    ),
    pull: vi.fn(async (_cursor: string | undefined) => ok({ cursor: "c1", changes: [] })),
    weather: vi.fn(async () => ok(FIXTURE_WEATHER)),
    places: vi.fn(),
    auth: { link: vi.fn(), status: vi.fn(), name: vi.fn(), signout: vi.fn() },
    upload: vi.fn(),
  } as unknown as Transport & {
    push: ReturnType<typeof vi.fn>;
    pull: ReturnType<typeof vi.fn>;
  };
}

function fakeLocks(): LockManager {
  const waiting: Array<() => void> = [];

  let held = false;

  const release = () => {
    const next = waiting.shift();

    if (next) next();
    else held = false;
  };

  const request = (
    _name: string,
    options: LockOptions,
    callback: (lock: Lock | null) => Promise<unknown>,
  ) =>
    new Promise((resolve, reject) => {
      const grant = () => {
        held = true;

        callback(null).then(resolve, reject).finally(release);
      };

      options.signal?.addEventListener("abort", () => {
        const index = waiting.indexOf(grant);

        if (index < 0) return;

        waiting.splice(index, 1);

        reject(new DOMException("Aborted", "AbortError"));
      });

      if (held) waiting.push(grant);
      else grant();
    });

  return { request } as unknown as LockManager;
}

function fakeStreams() {
  const opened: FakeStream[] = [];

  const openStream = (url: string, handlers: StreamHandlers) => {
    const stream: FakeStream = { ...handlers, url, isOpen: false, close: vi.fn() };

    opened.push(stream);

    return { isOpen: () => stream.isOpen, close: stream.close };
  };

  return { opened, openStream };
}

function open(stream: FakeStream | undefined) {
  if (stream === undefined) throw new Error("no stream");

  stream.isOpen = true;

  stream.opened();
}

type FakeTransport = ReturnType<typeof fakeTransport>;

function setup(overrides: Partial<WorkerDeps> & { transport?: FakeTransport } = {}) {
  const transport = overrides.transport ?? fakeTransport();

  const streams = fakeStreams();

  const events = new EventTarget();

  const restart = vi.fn();

  const photosChanged = vi.fn();

  const deps: WorkerDeps = {
    openDb: () => openGlanceDb(DB_NAME),
    transport,
    now: () => NOW,
    locks: fakeLocks(),
    openStream: streams.openStream,
    events,
    ...overrides,
  };

  const worker = createSyncWorker(deps);

  workers.push(worker);

  const page = { restart, photosChanged };

  return { worker, transport, streams, events, restart, photosChanged, page, deps };
}

async function started(overrides: Parameters<typeof setup>[0] = {}) {
  const parts = setup(overrides);

  await parts.worker.start(ACCOUNT_ID, parts.page);

  await vi.waitFor(() => expect(parts.transport.pull).toHaveBeenCalledTimes(1));

  return parts;
}

function useTimers() {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
}

function settled() {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

describe("glance-sync lock", () => {
  it("D19 the worker holding the lock syncs on start", async () => {
    const { transport } = await started();

    expect(transport.pull).toHaveBeenCalledWith(undefined);
  });

  it("D19 a worker waiting on the lock doesn't sync, even when nudged", async () => {
    const locks = fakeLocks();

    await started({ locks });

    const waiting = setup({ locks });

    await waiting.worker.start(ACCOUNT_ID, waiting.page);
    await waiting.worker.nudge();
    await settled();

    expect(waiting.transport.pull).not.toHaveBeenCalled();
    expect(waiting.streams.opened).toHaveLength(0);
  });

  it("D19 stopping the active worker hands the lock to a waiting one", async () => {
    const locks = fakeLocks();

    const active = await started({ locks });

    const waiting = setup({ locks });

    await waiting.worker.start(ACCOUNT_ID, waiting.page);

    await active.worker.stop();

    await vi.waitFor(() => expect(waiting.transport.pull).toHaveBeenCalledTimes(1));
  });

  it("D19 without Web Locks the worker syncs on its own", async () => {
    const { transport } = await started({ locks: undefined });

    expect(transport.pull).toHaveBeenCalledTimes(1);
  });
});

describe("triggers", () => {
  it("SYNC-02 opens the SSE stream and pulls on each ping", async () => {
    const { transport, streams } = await started();

    const stream = streams.opened[0];

    expect(stream?.url).toBe(SYNC_STREAM_PATH);

    open(stream);
    stream?.pinged();

    await vi.waitFor(() => expect(transport.pull).toHaveBeenCalledTimes(2));
  });

  it("SYNC-02 pulls when the stream reconnects but not when it first opens", async () => {
    const { transport, streams } = await started();

    const stream = streams.opened[0];

    open(stream);
    await settled();

    expect(transport.pull).toHaveBeenCalledTimes(1);

    open(stream);

    await vi.waitFor(() => expect(transport.pull).toHaveBeenCalledTimes(2));
  });

  it("tech§5 pulls when the stream first opens after a start that couldn't reach the server", async () => {
    useTimers();

    const transport = fakeTransport();

    transport.pull.mockImplementationOnce(async () => err<TransportError>("network"));

    const { streams } = await started({ transport });

    open(streams.opened[0]);

    await vi.waitFor(() => expect(transport.pull).toHaveBeenCalledTimes(2));
  });

  it("SYNC-02 polls every 30 s while the stream is closed, and not while it is open", async () => {
    useTimers();

    const { transport, streams } = await started();

    await vi.advanceTimersByTimeAsync(POLL_MS);

    await vi.waitFor(() => expect(transport.pull).toHaveBeenCalledTimes(2));

    open(streams.opened[0]);

    await vi.advanceTimersByTimeAsync(POLL_MS * 2);

    expect(transport.pull).toHaveBeenCalledTimes(2);
  });

  it("SYNC-02 without EventSource the worker polls every 30 s", async () => {
    useTimers();

    const { transport } = await started({ openStream: undefined });

    await vi.advanceTimersByTimeAsync(POLL_MS);
    await vi.waitFor(() => expect(transport.pull).toHaveBeenCalledTimes(2));

    await vi.advanceTimersByTimeAsync(POLL_MS);
    await vi.waitFor(() => expect(transport.pull).toHaveBeenCalledTimes(3));
  });

  it("tech§5 polling leaves a failed sync to its FAIL-03 backoff", async () => {
    useTimers();

    const transport = fakeTransport();

    transport.pull.mockImplementation(async () => err<TransportError>("network"));

    await started({ transport });

    await vi.advanceTimersByTimeAsync(POLL_MS);

    expect(transport.pull).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(POLL_MS);

    await vi.waitFor(() => expect(transport.pull).toHaveBeenCalledTimes(2));
  });

  it("tech§5 going back online syncs at once", async () => {
    const { transport, events } = await started();

    events.dispatchEvent(new Event("online"));

    await vi.waitFor(() => expect(transport.pull).toHaveBeenCalledTimes(2));
  });

  it("tech§4.6 a new outbox entry from any tab is pushed without a nudge", async () => {
    const { transport } = await started();

    const tab = openGlanceDb(DB_NAME);

    await tab.outbox.add({
      entity: "notes",
      entityId: "0195f0a0-0000-7000-8000-000000000201",
      op: "put",
      payload: { id: "0195f0a0-0000-7000-8000-000000000201", text: "Milk" },
      attempts: 0,
    } as OutboxEntry);

    tab.close();

    await vi.waitFor(() => expect(transport.push).toHaveBeenCalledTimes(1));
  });

  it("tech§4.6 nudge, resync and refreshWeather reach the engine", async () => {
    const { worker, transport } = await started();

    await worker.nudge();
    await worker.resync();

    expect(transport.pull).toHaveBeenCalledTimes(3);
    expect(transport.pull).toHaveBeenLastCalledWith(undefined);
  });
});

describe("photo warming", () => {
  it("tech§4.5 photos a pull brings in reach the page as photosChanged", async () => {
    const transport = fakeTransport();

    const photo = {
      id: "0195f0a0-0000-7000-8000-000000000201",
      title: "Cannon Beach",
      takenOn: "2026-09-12",
      createdAt: "2026-09-13T10:00:00.000Z",
      updatedAt: "2026-09-13T10:00:00.000Z",
      version: 1,
    };

    transport.pull.mockImplementation(async () =>
      ok({ cursor: "c1", changes: [{ entity: "photos", row: photo }] }),
    );

    const { photosChanged } = await started({ transport });

    await vi.waitFor(() => expect(photosChanged).toHaveBeenCalledWith([photo.id]));
  });
});

describe("stop and restart", () => {
  it("tech§4.6 stop closes the stream and ends polling", async () => {
    useTimers();

    const { worker, transport, streams } = await started();

    await worker.stop();

    await vi.advanceTimersByTimeAsync(POLL_MS * 2);

    expect(streams.opened[0]?.close).toHaveBeenCalled();
    expect(transport.pull).toHaveBeenCalledTimes(1);
  });

  it("tech§4.6 a schema upgrade elsewhere closes the DB, stops syncing and asks the page to restart", async () => {
    const { restart, streams } = await started();

    const upgrade = new Dexie(DB_NAME);

    upgrade.version(8).stores({ meta: "key" });

    await upgrade.open();

    upgrade.close();

    expect(restart).toHaveBeenCalledTimes(1);
    expect(streams.opened[0]?.close).toHaveBeenCalled();
  });
});
