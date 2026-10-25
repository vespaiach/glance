import * as stylex from "@stylexjs/stylex";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { colors, radii, sizes } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Icon } from "./Icon";

type PillLinkProps = {
  href: string;
  icon: LucideIcon;
  children: ReactNode;
};

const styles = stylex.create({
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minHeight: sizes.touchMin,
    paddingInline: 20,
    borderRadius: radii.pill,
    backgroundColor: colors.black,
    color: colors.white,
    textDecorationLine: "none",
    fontFamily: type.fontSans,
    fontSize: 17,
    fontWeight: 480,
    lineHeight: 1,
    whiteSpace: "nowrap",
  },
});

export function PillLink({ href, icon, children }: PillLinkProps) {
  return (
    <a href={href} {...stylex.props(styles.pill)}>
      <Icon icon={icon} size={18} />
      {children}
    </a>
  );
}
