"use client";

import * as stylex from "@stylexjs/stylex";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import { colors, sizes, space } from "@/theme/tokens.stylex";
import { useBreakpoint } from "./breakpoint";
import { NavBar } from "./NavBar";
import { VIEWS, viewForPath, viewPath } from "./routes";

const styles = stylex.create({
  root: {
    height: "100vh",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
  },
  main: {
    flexGrow: 1,
    minHeight: 0,
    overflow: "auto",
    boxSizing: "border-box",
    paddingTop: sizes.kioskGutter,
    paddingInline: sizes.kioskGutter,
    paddingBottom: space.lg,
  },
});

function usePrefetchViews() {
  const router = useRouter();

  useEffect(() => {
    for (const view of VIEWS) router.prefetch(viewPath(view));
  }, [router]);
}

function useScrollTopOnViewChange(pathname: string) {
  const main = useRef<HTMLElement>(null);

  const shownPath = useRef(pathname);

  useEffect(() => {
    if (shownPath.current === pathname || main.current === null) return;

    shownPath.current = pathname;
    main.current.scrollTop = 0;
  }, [pathname]);

  return main;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const router = useRouter();

  const breakpoint = useBreakpoint();

  const main = useScrollTopOnViewChange(pathname);

  usePrefetchViews();

  return (
    <div {...stylex.props(styles.root)}>
      <main ref={main} {...stylex.props(styles.main)}>
        {children}
      </main>
      <NavBar
        active={viewForPath(pathname)}
        compact={breakpoint === "phone"}
        onNavigate={(path) => router.push(path)}
      />
    </div>
  );
}
