"use client";

import { copy } from "@/copy";
import { useBreakpoint } from "@/shell/breakpoint";
import { ViewPlaceholder } from "@/shell/ViewPlaceholder";
import { todayAreas, todayLayout } from "./layout";

export function TodayScreen() {
  const breakpoint = useBreakpoint();

  return (
    <ViewPlaceholder
      label={copy.nav.view.today}
      layout={todayLayout(breakpoint)}
      zones={todayAreas}
    />
  );
}
