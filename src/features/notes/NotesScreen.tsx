"use client";

import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import { ViewPlaceholder } from "@/shell/ViewPlaceholder";

const styles = stylex.create({
  board: { minHeight: "100%" },
});

export function NotesScreen() {
  return (
    <ViewPlaceholder
      label={copy.nav.view.notes}
      layout={styles.board}
      zones={{ board: styles.board }}
    />
  );
}
