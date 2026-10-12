import * as stylex from "@stylexjs/stylex";
import type { Breakpoint } from "@/domain/breakpoint";
import { settingsLayout } from "@/features/settings";

const thumbs = stylex.create({
  wide: { gridTemplateColumns: "repeat(4, minmax(0, 1fr))" },
  mid: { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" },
  narrow: { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" },
  phone: { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
});

export function backgroundLayout(breakpoint: Breakpoint) {
  return { grid: settingsLayout(breakpoint), thumbs: thumbs[breakpoint] };
}
