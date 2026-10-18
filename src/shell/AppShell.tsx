"use client";

import * as stylex from "@stylexjs/stylex";
import { usePathname, useRouter } from "next/navigation";
import { type Dispatch, type ReactNode, useEffect, useReducer, useState } from "react";
import { colors, motion, sizes, space } from "@/theme/tokens.stylex";
import { useFieldInView } from "@/ui/fieldInView";
import { PhotoBackdrop } from "@/ui/PhotoBackdrop";
import { photoLayer } from "@/ui/photoLayer";
import { useBackgroundPhoto } from "./background";
import { useBreakpoint } from "./breakpoint";
import { useFixtureParams } from "./fixtureOptions";
import { useFixtureFieldFocus, useKeyboardInset } from "./keyboard";
import { OfflineNotice } from "./OfflineNotice";
import { VIEWS, viewForPath, viewPath } from "./routes";
import { SidebarDrawer } from "./SidebarDrawer";
import { SidebarGrip } from "./SidebarGrip";
import { SidebarRail } from "./SidebarRail";
import { initialSidebar, type SidebarAction, sidebarInset, sidebarReducer } from "./sidebar";
import { usePageTransition } from "./usePageTransition";

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

  const router = useRouter();

  const breakpoint = useBreakpoint();

  const main = usePageTransition<HTMLElement>(pathname);

  const photo = useBackgroundPhoto();

  const view = viewForPath(pathname);

  const keyboardInset = useKeyboardInset();

  const [sidebar, dispatch] = useReducer(sidebarReducer, useFixtureParams().rail, initialSidebar);

  const inset = sidebarInset(sidebar.mode);

  useRailOnViewChange(pathname, dispatch);

  useEscapeToRail(sidebar.mode === "expanded", dispatch);

  usePrefetchViews();

  useFieldInView(main, keyboardInset);

  useFixtureFieldFocus();

  return (
    <div
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
      <SidebarGrip shown={sidebar.mode === "hidden"} onShow={() => dispatch({ type: "show" })} />
      <SidebarRail
        mode={sidebar.mode}
        active={view}
        onOpen={() => dispatch({ type: "open" })}
        onNavigate={(path) => router.push(path)}
      />
      <SidebarDrawer
        open={sidebar.mode === "expanded"}
        active={view}
        onClose={() => dispatch({ type: "close" })}
        onNavigate={(path) => {
          dispatch({ type: "back" });
          router.push(path);
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

function useRailOnViewChange(pathname: string, dispatch: Dispatch<SidebarAction>) {
  const [shownOn, setShownOn] = useState(pathname);

  if (pathname !== shownOn) {
    setShownOn(pathname);
    dispatch({ type: "viewChanged" });
  }
}

function useEscapeToRail(expanded: boolean, dispatch: Dispatch<SidebarAction>) {
  useEffect(() => {
    if (!expanded) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch({ type: "back" });
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [expanded, dispatch]);
}
