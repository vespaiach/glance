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
import { useSheetHost } from "../SheetHost";
import { type NowStore, useNowStore } from "./now";
import { useAccountSettings } from "./settings";
import { useTimeZone } from "./timeZone";

const TODAY = "/today";

const AMBIENT = "/ambient";

const SIGN_IN = "/signin";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel"] as const;

const TEXT_INPUT_TYPES = new Set(["text", "email", "search", "tel", "url", "password", "number"]);

export function isTextField(element: Element | null): boolean {
  if (element instanceof HTMLTextAreaElement) return true;

  if (element instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(element.type);

  return element instanceof HTMLElement && element.isContentEditable;
}

function watchActivity(store: NowStore, onActive: (at: Date) => void): () => void {
  const touched = () => onActive(store.get());

  for (const type of ACTIVITY_EVENTS) document.addEventListener(type, touched, true);

  document.addEventListener("focusout", touched, true);

  return () => {
    for (const type of ACTIVITY_EVENTS) document.removeEventListener(type, touched, true);

    document.removeEventListener("focusout", touched, true);
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

        go(ambient ? AMBIENT : awake());
      }
    };

    const stopWatching = watchActivity(store, (at) => {
      lastActivity = at;
    });

    const unsubscribe = store.subscribe(onTick);

    return () => {
      stopWatching();
      unsubscribe();
    };
  }, [store, idleTimeout, schedule, tz]);

  return children;
}
