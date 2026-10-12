"use client";

import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import { useBreakpoint } from "@/shell/breakpoint";
import { ViewPlaceholder } from "@/shell/ViewPlaceholder";
import { settingsLayout } from "./layout";

const zones = stylex.create({ rows: { minHeight: 480 }, account: {} });

export function SettingsScreen() {
  const breakpoint = useBreakpoint();

  return (
    <ViewPlaceholder
      label={copy.nav.view.settings}
      layout={settingsLayout(breakpoint)}
      zones={zones}
    />
  );
}
