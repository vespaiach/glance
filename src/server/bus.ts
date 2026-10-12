import "server-only";
import { EventEmitter } from "node:events";
import type { Result } from "@/domain/result";

export type SyncBus = {
  publish: (accountId: string, version: number) => void;
  subscribe: (accountId: string, listener: (version: number) => void) => () => void;
};

const shared = globalThis as typeof globalThis & { glanceBus?: SyncBus };

export function createBus(): SyncBus {
  const emitter = new EventEmitter().setMaxListeners(0);

  return {
    publish: (accountId, version) => {
      emitter.emit(accountId, version);
    },
    subscribe: (accountId, listener) => {
      emitter.on(accountId, listener);

      return () => emitter.off(accountId, listener);
    },
  };
}

export function syncBus(): SyncBus {
  shared.glanceBus ??= createBus();

  return shared.glanceBus;
}

export function announce<T extends { version: number }, E>(
  bus: SyncBus,
  accountId: string,
  saved: Result<T, E>,
): Result<T, E> {
  if (saved.ok) bus.publish(accountId, saved.value.version);

  return saved;
}
