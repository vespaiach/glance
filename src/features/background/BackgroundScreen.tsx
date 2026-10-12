"use client";

import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import { useBreakpoint } from "@/shell/breakpoint";
import { ViewPlaceholder } from "@/shell/ViewPlaceholder";
import { backgroundLayout } from "./layout";

const zones = stylex.create({ picker: { minHeight: 480 }, preview: {} });

export function BackgroundScreen() {
  const breakpoint = useBreakpoint();

  return (
    <ViewPlaceholder
      label={copy.nav.background}
      layout={backgroundLayout(breakpoint).grid}
      zones={zones}
    />
  );
}
