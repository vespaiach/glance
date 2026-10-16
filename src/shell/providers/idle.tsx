"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import {
  type AppServiceWorker,
  appServiceWorker,
  useOutboxEmpty,
  useSignedOut,
  useSyncStatus,
} from "@/data/repos";
import { idleDue, inAmbient } from "@/domain/idle";
import { isTextField } from "../keyboard";
import { useSheetHost } from "../SheetHost";
import { type NowStore, useNowStore } from "./now";
import { useAccountSettings } from "./settings";
import { useTimeZone } from "./timeZone";

const TODAY = "/today";

const AMBIENT = "/ambient";

const SIGN_IN = "/signin";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel"] as const;

type Activity = { onTouch: (at: Date) => void; onFieldLeft: (at: Date) => void };

function watchActivity(store: NowStore, { onTouch, onFieldLeft }: Activity): () => void {
  const touched = () => onTouch(store.get());

  const left = () => onFieldLeft(store.get());

  for (const type of ACTIVITY_EVENTS) document.addEventListener(type, touched, true);

  document.addEventListener("focusout", left, true);

  return () => {
    for (const type of ACTIVITY_EVENTS) document.removeEventListener(type, touched, true);

    document.removeEventListener("focusout", left, true);
  };
}

function loadPage(path: string) {
  window.location.assign(path);
}

export type IdleUpdates = Pick<
  AppServiceWorker,
  "updateWaiting" | "applyUpdate" | "checkForUpdate"
>;

type UpdateState = { updates: IdleUpdates; outdated: boolean; outboxEmpty: boolean };

function updateDue({ updates, outdated, outboxEmpty }: UpdateState): boolean {
  return updates.updateWaiting() && (outdated || outboxEmpty);
}

type IdleProps = {
  reload?: (path: string) => void;
  updates?: IdleUpdates;
  children: ReactNode;
};

export function IdleProvider({
  reload = loadPage,
  updates = appServiceWorker(),
  children,
}: IdleProps) {
  const { idleTimeout, ambient: schedule } = useAccountSettings();

  const store = useNowStore();

  const tz = useTimeZone();

  const { close } = useSheetHost();

  const router = useRouter();

  const pathname = usePathname();

  const outdated = useSyncStatus()?.error === "outdated";

  const outboxEmpty = useOutboxEmpty() === true;

  const signedOut = useSignedOut();

  const current = {
    pathname,
    close,
    signedOut,
    navigate: router.push,
    outdated,
    outboxEmpty,
    reload,
    updates,
  };

  const latest = useRef(current);

  useEffect(() => {
    latest.current = current;
  });

  useEffect(() => {
    if (outdated) updates.checkForUpdate();
  }, [outdated, updates]);

  useEffect(() => {
    let lastActivity = store.get();

    let ambient = inAmbient(schedule, lastActivity, tz);

    const awake = () => (latest.current.signedOut ? SIGN_IN : TODAY);

    const go = (path: string) => {
      const { close, reload, updates, signedOut } = latest.current;

      if (!signedOut) close();

      if (updateDue(latest.current)) return updates.applyUpdate(() => reload(path));

      if (latest.current.outdated) return reload(path);

      if (latest.current.pathname === path) return;

      latest.current.navigate(path);
      latest.current.pathname = path;
    };

    const onTick = () => {
      const now = store.get();

      const nowAmbient = inAmbient(schedule, now, tz);

      if (isTextField(document.activeElement)) lastActivity = now;

      if (nowAmbient !== ambient) {
        ambient = nowAmbient;

        if (nowAmbient || latest.current.pathname === AMBIENT) go(nowAmbient ? AMBIENT : awake());
      }

      if (idleDue(lastActivity, now, idleTimeout)) {
        lastActivity = now;

        const target = ambient ? AMBIENT : awake();

        go(target);
      }
    };

    const stopWatching = watchActivity(store, {
      onTouch: (at) => {
        lastActivity = at;
      },
      onFieldLeft: (at) => {
        lastActivity = at;
      },
    });

    const unsubscribe = store.subscribe(onTick);

    return () => {
      stopWatching();
      unsubscribe();
    };
  }, [store, idleTimeout, schedule, tz]);

  return children;
}
