import { proxy, wrap } from "comlink";
import type { GlanceDb } from "../db";
import { createSyncWorker, liveWorkerDeps, type SyncWorkerApi } from "./worker";

export const PING_MS = 60_000;

export const PING_TIMEOUT_MS = 10_000;

export type SyncHost = {
  start(accountId: string): Promise<void>;
  nudge(): Promise<void>;
  resync(): Promise<void>;
  refreshWeather(): Promise<void>;
  stop(): void;
};

export type SpawnedWorker = { api: SyncWorkerApi; terminate(): void };

type WorkerHostOptions = {
  db: GlanceDb;
  spawn: () => SpawnedWorker;
  photosChanged: (ids: string[]) => void;
};

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

  let watchdog: ReturnType<typeof setInterval> | undefined;

  const halt = () => {
    clearInterval(watchdog);

    worker?.terminate();

    worker = undefined;
  };

  const launch = (id: string) => {
    const spawned = spawn();

    worker = spawned;

    watchdog = setInterval(() => void restartUnless(spawned), PING_MS);

    return spawned.api.start(id, proxy({ restart, photosChanged }));
  };

  const restartUnless = async (watched: SpawnedWorker) => {
    if (await answers(watched.api.ping())) return;

    if (worker !== watched) return;

    halt();

    relaunch();
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

function answers(ping: Promise<void>): Promise<boolean> {
  const silence = new Promise<boolean>((done) => setTimeout(() => done(false), PING_TIMEOUT_MS));

  return Promise.race([
    ping.then(
      () => true,
      () => false,
    ),
    silence,
  ]);
}
