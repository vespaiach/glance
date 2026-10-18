"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { dayNumber } from "@/domain/zone";
import { useTimeZone } from "./timeZone";

export type Granularity = "second" | "minute" | "day";

export type NowStore = {
  get(): Date;
  subscribe(listener: () => void): () => void;
};

type RunningNowStore = NowStore & {
  start(): () => void;
  release(): void;
};

const TICK_MS = 1000;

const NowContext = createContext<NowStore | undefined>(undefined);

export function NowProvider({ frozenAt, children }: { frozenAt?: Date; children: ReactNode }) {
  const [store] = useState(() => createNowStore(frozenAt));

  useEffect(() => store.start(), [store]);

  useReleaseOnFirstTap(store, frozenAt !== undefined);

  return <NowContext value={store}>{children}</NowContext>;
}

export function useNowStore(): NowStore {
  const store = useContext(NowContext);

  if (store === undefined) throw new Error("useNow needs a NowProvider");

  return store;
}

export function useNow(granularity: Granularity = "second"): Date {
  const store = useNowStore();

  const tz = useTimeZone();

  const shown = useRef<Date | undefined>(undefined);

  const snapshot = () => {
    const now = store.get();

    if (
      shown.current === undefined ||
      bucket(shown.current, granularity, tz) !== bucket(now, granularity, tz)
    ) {
      shown.current = now;
    }

    return shown.current;
  };

  return useSyncExternalStore(store.subscribe, snapshot, snapshot);
}

function createNowStore(frozenAt: Date | undefined): RunningNowStore {
  const listeners = new Set<() => void>();

  let offset = 0;

  let frozen = frozenAt !== undefined;

  let now = frozenAt ?? new Date();

  const tick = () => {
    if (frozen) return;

    now = new Date(Date.now() + offset);

    for (const listener of listeners) listener();
  };

  return {
    get: () => now,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    start: () => {
      const timer = setInterval(tick, TICK_MS);

      return () => clearInterval(timer);
    },
    release: () => {
      offset = now.getTime() - Date.now();
      frozen = false;
    },
  };
}

function useReleaseOnFirstTap(store: RunningNowStore, frozen: boolean) {
  useEffect(() => {
    if (!frozen) return;

    const release = () => store.release();

    document.addEventListener("pointerdown", release, { capture: true, once: true });

    return () => document.removeEventListener("pointerdown", release, { capture: true });
  }, [store, frozen]);
}

function bucket(date: Date, granularity: Granularity, tz: string): number {
  if (granularity === "day") return dayNumber(date, tz);

  return Math.floor(date.getTime() / (granularity === "minute" ? 60_000 : TICK_MS));
}
