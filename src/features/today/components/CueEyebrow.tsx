import * as stylex from "@stylexjs/stylex";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";

const styles = stylex.create({
  root: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  chevron: {
    display: "flex",
  },
});

export function CueEyebrow({ children }: { children: ReactNode }) {
  return (
    <span {...stylex.props(styles.root)}>
      <Eyebrow>{children}</Eyebrow>
      <span {...stylex.props(styles.chevron)}>
        <Icon icon={ChevronRight} size={16} strokeWidth={2} />
      </span>
    </span>
  );
}
