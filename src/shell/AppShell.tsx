"use client";

import * as stylex from "@stylexjs/stylex";
import { usePathname, useRouter } from "next/navigation";
import {
  type Dispatch,
  type ReactNode,
  type RefObject,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { idleDue } from "@/domain/idle";
import { colors, motion, sizes, space } from "@/theme/tokens.stylex";
import { useFieldInView } from "@/ui/fieldInView";
import { PhotoBackdrop } from "@/ui/PhotoBackdrop";
import { photoLayer } from "@/ui/photoLayer";
import { useBackgroundPhoto } from "./background";
import { useBreakpoint } from "./breakpoint";
import { useFixtureParams } from "./fixtureOptions";
import { isTextField, useFixtureFieldFocus, useKeyboardInset } from "./keyboard";
import { OfflineNotice } from "./OfflineNotice";
import { useNowStore } from "./providers/now";
import { useAccountSettings } from "./providers/settings";
import { VIEWS, type View, viewForPath, viewPath } from "./routes";
import { useSheetHost } from "./SheetHost";
import { SidebarDrawer } from "./SidebarDrawer";
import { SidebarGrip } from "./SidebarGrip";
import { SidebarHandle } from "./SidebarHandle";
import { SidebarRail } from "./SidebarRail";
import {
  initialSidebar,
  SIDEBAR_IDLE_SECONDS,
  type SidebarAction,
  sidebarInset,
  sidebarReducer,
} from "./sidebar";
import { useAmbientNavigate, useAmbientRoot } from "./useAmbientNavigate";
import { usePageTransition } from "./usePageTransition";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "focusout"] as const;

const styles = stylex.create({
  root: {
    height: "100vh",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    position: "relative",
    isolation: "isolate",
    backgroundColor: colors.hairlineSoft,
    color: colors.textPrimary,
    transitionProperty: "background-color, padding-bottom, padding-left",
    transitionDuration: `${motion.durSeason}, ${motion.durBase}, ${motion.durBase}`,
    transitionTimingFunction: `${motion.easeInOut}, ${motion.easeOut}, ${motion.easeSlide}`,
  },
  aboveKeyboard: (inset: number) => ({ paddingBottom: inset }),
  besideSidebar: (inset: number) => ({ paddingLeft: inset }),
  main: {
    flexGrow: 1,
    minHeight: 0,
    overflow: "auto",
    boxSizing: "border-box",
    paddingTop: sizes.kioskGutter,
    paddingInline: sizes.kioskGutter,
    paddingBottom: space.md,
  },
});

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const navigate = useAmbientNavigate();

  const breakpoint = useBreakpoint();

  const shell = useRef<HTMLDivElement>(null);

  const main = usePageTransition<HTMLElement>(pathname);

  const photo = useBackgroundPhoto();

  const view = viewForPath(pathname);

  const keyboardInset = useKeyboardInset();

  const rail = useFixtureParams().rail;

  const sheetOpen = useSheetHost().sheet !== null;

  const { hideSidebarWhenIdle } = useAccountSettings();

  const [sidebar, dispatch] = useReducer(sidebarReducer, rail, (fixture) =>
    initialSidebar(fixture, view),
  );

  const handle = useRef<HTMLButtonElement>(null);

  const grip = useRef<HTMLButtonElement>(null);

  const phone = breakpoint === "phone";

  const inset = sidebarInset(sidebar.mode, phone);

  useAmbientRoot(shell, pathname);

  useRailOnViewChange(pathname, view, dispatch);

  useEscapeToRail(sidebar.mode === "expanded", dispatch, handle);

  useHideWhenIdle(
    hideSidebarWhenIdle && sidebar.mode !== "hidden" && !sheetOpen && keyboardInset === 0,
    dispatch,
  );

  usePrefetchViews();

  useFieldInView(main, keyboardInset);

  useFixtureFieldFocus();

  return (
    <div
      ref={shell}
      {...stylex.props(
        styles.root,
        styles.aboveKeyboard(keyboardInset),
        styles.besideSidebar(inset),
      )}
    >
      <PhotoBackdrop image={photo && photoLayer(photo.dim, photo.src)} />
      <main ref={main} {...stylex.props(styles.main)}>
        {children}
      </main>
      <SidebarGrip
        ref={grip}
        shown={sidebar.mode === "hidden"}
        onShow={() => dispatchThenFocus(dispatch, handle, { type: "show" })}
      />
      <SidebarRail
        mode={sidebar.mode}
        phone={phone}
        active={view}
        onHide={() => dispatchThenFocus(dispatch, grip, { type: "hide" })}
        onNavigate={navigate}
      />
      <SidebarHandle
        ref={handle}
        shown={sidebar.mode !== "hidden"}
        expanded={sidebar.mode === "expanded"}
        phone={phone}
        onOpen={() => dispatch({ type: "open" })}
      />
      <SidebarDrawer
        open={sidebar.mode === "expanded"}
        phone={phone}
        active={view}
        onClose={() => dispatchThenFocus(dispatch, grip, { type: "close" })}
        onScrimTap={() => dispatchThenFocus(dispatch, handle, { type: "back" })}
        onNavigate={(path) => {
          dispatchThenFocus(dispatch, handle, { type: "back" });
          navigate(path);
        }}
      />
      <OfflineNotice breakpoint={breakpoint} inset={inset} onWeather={view === "weather"} />
    </div>
  );
}

function usePrefetchViews() {
  const router = useRouter();

  useEffect(() => {
    for (const view of VIEWS) router.prefetch(viewPath(view));
  }, [router]);
}

function useRailOnViewChange(
  pathname: string,
  view: View | undefined,
  dispatch: Dispatch<SidebarAction>,
) {
  const [shownOn, setShownOn] = useState(pathname);

  if (pathname !== shownOn) {
    setShownOn(pathname);
    dispatch({ type: "viewChanged", view });
  }
}

function useEscapeToRail(
  expanded: boolean,
  dispatch: Dispatch<SidebarAction>,
  handle: RefObject<HTMLButtonElement | null>,
) {
  useEffect(() => {
    if (!expanded) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatchThenFocus(dispatch, handle, { type: "back" });
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [expanded, dispatch, handle]);
}

function useHideWhenIdle(running: boolean, dispatch: Dispatch<SidebarAction>) {
  const store = useNowStore();

  useEffect(() => {
    if (!running) return;

    let lastActivity = store.get();

    const touched = () => {
      lastActivity = store.get();
    };

    const onTick = () => {
      const now = store.get();

      if (isTextField(document.activeElement)) lastActivity = now;

      if (idleDue(lastActivity, now, SIDEBAR_IDLE_SECONDS)) dispatch({ type: "idle" });
    };

    const stopWatching = watchActivity(touched);

    const unsubscribe = store.subscribe(onTick);

    return () => {
      stopWatching();
      unsubscribe();
    };
  }, [running, store, dispatch]);
}

function watchActivity(touched: () => void): () => void {
  for (const type of ACTIVITY_EVENTS) document.addEventListener(type, touched, true);

  return () => {
    for (const type of ACTIVITY_EVENTS) document.removeEventListener(type, touched, true);
  };
}

function dispatchThenFocus(
  dispatch: Dispatch<SidebarAction>,
  target: RefObject<HTMLButtonElement | null>,
  action: SidebarAction,
) {
  flushSync(() => dispatch(action));

  target.current?.focus();
}
