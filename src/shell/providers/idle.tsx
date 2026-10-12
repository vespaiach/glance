"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import { useSyncStatus } from "@/data/repos";
import { idleDue, inAmbientHours } from "@/domain/idle";
import { useSheetHost } from "../SheetHost";
import { type NowStore, useNowStore } from "./now";
import { useAccountSettings } from "./settings";

const TODAY = "/today";

const AMBIENT = "/ambient";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel"] as const;

const TEXT_INPUT_TYPES = new Set(["text", "email", "search", "tel", "url", "password", "number"]);

function isTextField(element: Element | null): boolean {
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

type IdleProps = { reload?: (path: string) => void; children: ReactNode };

export function IdleProvider({ reload = loadPage, children }: IdleProps) {
  const { idleTimeout, ambientHours } = useAccountSettings();

  const store = useNowStore();

  const { close } = useSheetHost();

  const router = useRouter();

  const pathname = usePathname();

  const outdated = useSyncStatus()?.error === "outdated";

  const latest = useRef({ pathname, close, navigate: router.push, outdated, reload });

  useEffect(() => {
    latest.current = { pathname, close, navigate: router.push, outdated, reload };
  });

  useEffect(() => {
    let lastActivity = store.get();

    let ambient = inAmbientHours(ambientHours, lastActivity);

    const go = (path: string) => {
      latest.current.close();

      if (latest.current.outdated) return latest.current.reload(path);

      if (latest.current.pathname === path) return;

      latest.current.navigate(path);
      latest.current.pathname = path;
    };

    const onTick = () => {
      const now = store.get();

      const nowAmbient = inAmbientHours(ambientHours, now);

      if (isTextField(document.activeElement)) lastActivity = now;

      if (nowAmbient !== ambient) {
        ambient = nowAmbient;

        if (nowAmbient || latest.current.pathname === AMBIENT) go(nowAmbient ? AMBIENT : TODAY);
      }

      if (idleDue(lastActivity, now, idleTimeout)) {
        lastActivity = now;

        go(ambient ? AMBIENT : TODAY);
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
  }, [store, idleTimeout, ambientHours]);

  return children;
}
