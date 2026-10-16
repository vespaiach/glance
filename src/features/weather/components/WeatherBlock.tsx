import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { ColorBlock } from "@/ui/ColorBlock";

const styles = stylex.create({
  center: {
    minHeight: "100%",
    display: "grid",
    placeItems: "center",
  },
  block: {
    width: "100%",
    maxWidth: 680,
    display: "flex",
    flexDirection: "column",
    gap: 32,
  },
});

export function WeatherBlock({ children }: { children: ReactNode }) {
  return (
    <div {...stylex.props(styles.center)}>
      <ColorBlock tone={3} padding="clamp(28px, 3.2vw, 48px)" xstyle={styles.block}>
        {children}
      </ColorBlock>
    </div>
  );
}
