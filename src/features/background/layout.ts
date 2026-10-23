import * as stylex from "@stylexjs/stylex";
import { type Breakpoint, layoutSize } from "@/domain/breakpoint";
import { settingsLayout } from "@/features/settings";

const thumbs = stylex.create({
  large: { gridTemplateColumns: "repeat(4, minmax(0, 1fr))" },
  small: { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
});

export function backgroundLayout(breakpoint: Breakpoint) {
  return { grid: settingsLayout(breakpoint), thumbs: thumbs[layoutSize(breakpoint)] };
}
