"use client";

import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import { useBreakpoint } from "@/shell/breakpoint";
import { ViewPlaceholder } from "@/shell/ViewPlaceholder";
import { weatherLayout } from "./layout";

const zones = stylex.create({ now: {}, forecast: {} });

export function WeatherScreen() {
  const breakpoint = useBreakpoint();

  return (
    <ViewPlaceholder
      label={copy.nav.view.weather}
      layout={weatherLayout(breakpoint).grid}
      zones={zones}
    />
  );
}
