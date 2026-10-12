"use client";

import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import { useBreakpoint } from "@/shell/breakpoint";
import { ViewPlaceholder } from "@/shell/ViewPlaceholder";
import { calendarLayout } from "./layout";

const zones = stylex.create({
  month: {
    width: {
      default: "auto",
      "@media (min-width: 1000px)": 480,
    },
  },
  day: {},
});

export function CalendarScreen() {
  const breakpoint = useBreakpoint();

  return (
    <ViewPlaceholder
      label={copy.nav.view.calendar}
      layout={calendarLayout(breakpoint)}
      zones={zones}
    />
  );
}
