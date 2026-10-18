import { proxy, wrap } from "comlink";
import type { GlanceDb } from "../db";
import { createSyncEngine, type SyncEngine } from "./engine";
import type { Transport } from "./transport";
import { createSyncWorker, liveWorkerDeps, type SyncWorkerApi } from "./worker";

export type SyncHost = {
  start(accountId: string): Promise<void>;
  nudge(): Promise<void>;
  resync(): Promise<void>;
  refreshWeather(): Promise<void>;
  stop(): void;
};

type Options = { db: GlanceDb; transport: Transport; now: () => Date };

export type SpawnedWorker = { api: SyncWorkerApi; terminate(): void };

type WorkerHostOptions = {
  db: GlanceDb;
  spawn: () => SpawnedWorker;
  photosChanged: (ids: string[]) => void;
};

export function createInlineSyncHost(options: Options): SyncHost {
  let engine: SyncEngine | undefined;

  const run = async (task: (running: SyncEngine) => Promise<unknown>) => {
    if (engine) await task(engine);
  };

  return {
    start: (accountId) => {
      engine?.stop();

      engine = createSyncEngine({ ...options, accountId });

      return engine.start();
    },
    nudge: () => run((running) => running.nudge()),
    resync: () => run((running) => running.resync()),
    refreshWeather: () => run((running) => running.refreshWeather()),
    stop: () => {
      engine?.stop();

      engine = undefined;
    },
  };
}

export function spawnSyncWorker(): SpawnedWorker {
  if (typeof Worker === "undefined") {
    const api = createSyncWorker(liveWorkerDeps(window));

    return { api, terminate: () => void api.stop() };
  }

  const worker = new Worker(new URL("./sync.worker.ts", import.meta.url), { type: "module" });

  return { api: wrap<SyncWorkerApi>(worker), terminate: () => worker.terminate() };
}

export function createWorkerSyncHost({ db, spawn, photosChanged }: WorkerHostOptions): SyncHost {
  let worker: SpawnedWorker | undefined;

  let accountId: string | undefined;

  const halt = () => {
    worker?.terminate();

    worker = undefined;
  };

  const launch = (id: string) => {
    worker = spawn();

    return worker.api.start(id, proxy({ restart, photosChanged }));
  };

  const relaunch = () => {
    if (accountId !== undefined) void launch(accountId);
  };

  const restart = () => {
    halt();

    db.open().then(relaunch, () => {});
  };

  const run = async (task: (api: SyncWorkerApi) => Promise<void>) => {
    if (worker) await task(worker.api);
  };

  return {
    start: (id) => {
      halt();

      accountId = id;

      return launch(id);
    },
    nudge: () => run((api) => api.nudge()),
    resync: () => run((api) => api.resync()),
    refreshWeather: () => run((api) => api.refreshWeather()),
    stop: () => {
      halt();

      accountId = undefined;
    },
  };
}
