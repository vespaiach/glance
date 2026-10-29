import { liveQuery } from "dexie";
import { accountDbName, type GlanceDb, openGlanceDb } from "../db";
import { createErrorReporter, type ReportError } from "../repos/clientErrors";
import { createSyncEngine, type SyncEngine } from "./engine";
import { createHttpTransport } from "./httpTransport";
import type { Transport } from "./transport";

export const SYNC_LOCK = "glance-sync";

export const SYNC_STREAM_PATH = "/api/sync/stream";

export const POLL_MS = 30_000;

export type PageCallbacks = { restart(): void; photosChanged(ids: string[]): void };

export type SyncWorkerApi = {
  start(accountId: string, page: PageCallbacks): Promise<void>;
  nudge(): Promise<void>;
  resync(): Promise<void>;
  refreshWeather(): Promise<void>;
  ping(): Promise<void>;
  stop(): Promise<void>;
};

export type StreamHandlers = { opened(): void; pinged(): void };

export type SyncStream = { isOpen(): boolean; close(): void };

export type WorkerDeps = {
  openDb(accountId: string): GlanceDb;
  transport: Transport;
  now(): Date;
  locks: LockManager | undefined;
  openStream: ((url: string, handlers: StreamHandlers) => SyncStream) | undefined;
  events: EventTarget;
  report: ReportError;
};

type Session = { engine(): SyncEngine | undefined; stop(): void };

type Triggered = { sync: () => void; retrying: () => boolean };

type Activation = { db: GlanceDb; accountId: string; page: PageCallbacks; signal: AbortSignal };

export function createSyncWorker(deps: WorkerDeps): SyncWorkerApi {
  let session: Session | undefined;

  const run = async (task: (engine: SyncEngine) => Promise<unknown>) => {
    const engine = session?.engine();

    if (engine) await task(engine);
  };

  return {
    start: async (accountId, page) => {
      session?.stop();

      session = startSession(deps, accountId, page);
    },
    nudge: () => run((engine) => engine.nudge()),
    resync: () => run((engine) => engine.resync()),
    refreshWeather: () => run((engine) => engine.refreshWeather()),
    ping: async () => {},
    stop: async () => {
      session?.stop();

      session = undefined;
    },
  };
}

export function liveWorkerDeps(events: EventTarget): WorkerDeps {
  return {
    openDb: (accountId) => openGlanceDb(accountDbName(accountId)),
    transport: createHttpTransport(),
    now: () => new Date(),
    locks: navigator.locks,
    openStream: typeof EventSource === "undefined" ? undefined : openEventSource,
    events,
    report: createErrorReporter({ events }),
  };
}

function holdLock(locks: LockManager | undefined, signal: AbortSignal, onHeld: () => void) {
  if (locks === undefined) return onHeld();

  const held = () => {
    onHeld();

    return new Promise<void>((release) => signal.addEventListener("abort", () => release()));
  };

  locks.request(SYNC_LOCK, { signal }, held).catch((error: unknown) => {
    if (!signal.aborted) throw error;
  });
}

function watchOutbox(deps: WorkerDeps, db: GlanceDb, onQueued: () => void, signal: AbortSignal) {
  let highest: number | undefined;

  const subscription = liveQuery(() => db.outbox.orderBy("seq").last()).subscribe({
    next: (entry) => {
      const seq = entry?.seq ?? 0;

      if (highest !== undefined && seq > highest) onQueued();

      highest = Math.max(highest ?? 0, seq);
    },
    error: (error: unknown) => deps.report("outbox-watch-failed", error),
  });

  signal.addEventListener("abort", () => subscription.unsubscribe());
}

function openTriggers(deps: WorkerDeps, { sync, retrying }: Triggered, signal: AbortSignal) {
  let everOpened = false;

  const opened = () => {
    if (everOpened || retrying()) sync();

    everOpened = true;
  };

  const stream = deps.openStream?.(SYNC_STREAM_PATH, { opened, pinged: sync });

  deps.events.addEventListener("online", sync, { signal });

  signal.addEventListener("abort", () => stream?.close());

  return stream;
}

function activate(deps: WorkerDeps, { db, accountId, page, signal }: Activation) {
  const { transport, now } = deps;

  const photosChanged = page.photosChanged;

  const engine = createSyncEngine({ db, transport, accountId, now, photosChanged });

  const quietly = (run: Promise<unknown>) =>
    run.catch((error: unknown) => {
      if (!signal.aborted) throw error;
    });

  const sync = () => void quietly(engine.nudge());

  void quietly(engine.start());

  watchOutbox(deps, db, sync, signal);

  const stream = openTriggers(deps, { sync, retrying: engine.retrying }, signal);

  const poll = setInterval(() => {
    if (!stream?.isOpen() && !engine.retrying()) sync();
  }, POLL_MS);

  signal.addEventListener("abort", () => {
    clearInterval(poll);

    engine.stop();
  });

  return engine;
}

function startSession(deps: WorkerDeps, accountId: string, page: PageCallbacks): Session {
  const db = deps.openDb(accountId);

  const quit = new AbortController();

  let engine: SyncEngine | undefined;

  const stop = () => {
    quit.abort();

    db.close();
  };

  db.on("versionchange", () => {
    stop();

    page.restart();
  });

  holdLock(deps.locks, quit.signal, () => {
    engine = activate(deps, { db, accountId, page, signal: quit.signal });
  });

  return { engine: () => engine, stop };
}

function openEventSource(url: string, { opened, pinged }: StreamHandlers): SyncStream {
  const source = new EventSource(url);

  source.onopen = opened;
  source.onmessage = pinged;

  return { isOpen: () => source.readyState === EventSource.OPEN, close: () => source.close() };
}
