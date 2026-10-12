"use client";

import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import { season } from "@/theme/seasons.stylex";

const styles = stylex.create({
  root: {
    height: "100vh",
    backgroundColor: season.deep,
    color: season.onDeep,
  },
});

export function AmbientScreen() {
  return <main aria-label={copy.nav.ambient} {...stylex.props(styles.root)} />;
}
