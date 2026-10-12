"use client";

import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import { useBreakpoint } from "@/shell/breakpoint";
import { ViewPlaceholder } from "@/shell/ViewPlaceholder";
import { photosLayout } from "./layout";

const zones = stylex.create({ featured: {}, thumbs: {} });

export function PhotosScreen() {
  const breakpoint = useBreakpoint();

  return (
    <ViewPlaceholder
      label={copy.nav.view.photos}
      layout={photosLayout(breakpoint).grid}
      zones={zones}
    />
  );
}
