import type { GlanceDb } from "../db";
import { createSyncEngine, type SyncEngine } from "./engine";
import type { Transport } from "./transport";

export type SyncHost = {
  start(accountId: string): Promise<void>;
  nudge(): Promise<void>;
  resync(): Promise<void>;
  refreshWeather(): Promise<void>;
  stop(): void;
};

type Options = { db: GlanceDb; transport: Transport; now: () => Date };

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
