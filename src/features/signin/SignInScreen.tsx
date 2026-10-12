"use client";

import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import { useBreakpoint } from "@/shell/breakpoint";
import { ViewPlaceholder } from "@/shell/ViewPlaceholder";
import { colors, sizes } from "@/theme/tokens.stylex";
import { signInLayout } from "./layout";

const styles = stylex.create({
  root: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
  },
  main: {
    flexGrow: 1,
    minHeight: 0,
    overflow: "auto",
    boxSizing: "border-box",
    padding: sizes.kioskGutter,
  },
});

const zones = stylex.create({ hero: {}, form: {} });

export function SignInScreen() {
  const breakpoint = useBreakpoint();

  return (
    <div {...stylex.props(styles.root)}>
      <main {...stylex.props(styles.main)}>
        <ViewPlaceholder label={copy.nav.signIn} layout={signInLayout(breakpoint)} zones={zones} />
      </main>
    </div>
  );
}
