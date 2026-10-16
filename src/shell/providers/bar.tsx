"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { type BarMode, barIdleDue, barReducer, initialBar } from "../bar";
import { useFixtureParams } from "../fixtureOptions";
import { isTextField, useKeyboardInset } from "../keyboard";
import { useSheetHost } from "../SheetHost";
import { useNowStore } from "./now";
import { useAccountSettings } from "./settings";

export type BarValue = {
  mode: BarMode;
  touch(): void;
  hide(): void;
  block(): () => void;
};

const BarContext = createContext<BarValue | undefined>(undefined);

function useDockOnViewChange(dispatch: (action: { type: "viewChanged" }) => void) {
  const pathname = usePathname();

  const [shownOn, setShownOn] = useState(pathname);

  if (pathname !== shownOn) {
    setShownOn(pathname);
    dispatch({ type: "viewChanged" });
  }
}

export function BarProvider({ children }: { children: ReactNode }) {
  const enabled = useAccountSettings().hideBarWhenIdle;

  const store = useNowStore();

  const sheetOpen = useSheetHost().sheet !== null;

  const keyboardUp = useKeyboardInset() > 0;

  const blocked = sheetOpen || keyboardUp;

  const [state, dispatch] = useReducer(barReducer, useFixtureParams().bar, initialBar);

  const lastTouch = useRef<Date | undefined>(undefined);

  const blocks = useRef(0);

  const latest = useRef({ enabled, blocked });

  useDockOnViewChange(dispatch);

  useEffect(() => {
    latest.current = { enabled, blocked };
  });

  useEffect(() => {
    lastTouch.current = store.get();

    return store.subscribe(() => {
      const now = store.get();

      if (latest.current.blocked || blocks.current > 0 || isTextField(document.activeElement)) {
        lastTouch.current = now;
      }

      if (!latest.current.enabled || !barIdleDue(lastTouch.current ?? now, now)) return;

      dispatch({ type: "idle" });
    });
  }, [store]);

  const mode = enabled ? state.mode : "docked";

  const bar = useMemo(
    () => ({
      mode,
      touch: () => {
        lastTouch.current = store.get();
        dispatch({ type: "touch" });
      },
      hide: () => {
        if (latest.current.enabled) dispatch({ type: "idle" });
      },
      block: () => {
        blocks.current += 1;

        return () => {
          blocks.current -= 1;
        };
      },
    }),
    [mode, store],
  );

  return <BarContext value={bar}>{children}</BarContext>;
}

export function useBar(): BarValue {
  const bar = useContext(BarContext);

  if (bar === undefined) throw new Error("useBar needs a BarProvider");

  return bar;
}

export function useBarBlock(active: boolean) {
  const { block } = useBar();

  useEffect(() => (active ? block() : undefined), [active, block]);
}
