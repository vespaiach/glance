import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors, space } from "@/theme/tokens.stylex";
import { Eyebrow } from "@/ui/Eyebrow";

type GalleryGroupProps = {
  title: string;
  children: ReactNode;
  column?: boolean;
};

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space.md,
    paddingBlock: space.lg,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderHairlineSoft,
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: space.md,
  },
  column: {
    flexDirection: "column",
    alignItems: "stretch",
  },
});

export function GalleryGroup({ title, children, column }: GalleryGroupProps) {
  return (
    <section {...stylex.props(styles.root)}>
      <Eyebrow>{title}</Eyebrow>
      <div {...stylex.props(styles.row, column && styles.column)}>{children}</div>
    </section>
  );
}
