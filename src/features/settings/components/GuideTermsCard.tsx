import * as stylex from "@stylexjs/stylex";
import { ArrowUpRight } from "lucide-react";
import { copy } from "@/copy";
import { colors, radii, sizes, space } from "@/theme/tokens.stylex";
import { Icon } from "@/ui/Icon";

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.lg,
    paddingBlock: space.xs,
    paddingInline: sizes.kioskGutter,
    boxSizing: "border-box",
  },
  link: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    minHeight: sizes.iconButtonTouch,
    color: colors.textPrimary,
    textDecorationLine: "none",
  },
  divided: {
    boxShadow: `inset 0 1px 0 ${colors.borderHairlineSoft}`,
  },
  label: {
    fontSize: 17,
    fontWeight: 540,
    letterSpacing: "-0.1px",
  },
});

export function GuideTermsCard() {
  const text = copy.settings.links;

  return (
    <nav aria-label={text.label} {...stylex.props(styles.root)}>
      <a href="/guide" target="_blank" rel="noopener" {...stylex.props(styles.link)}>
        <span {...stylex.props(styles.label)}>{text.guide}</span>
        <Icon icon={ArrowUpRight} size={20} />
      </a>
      <a
        href="/terms"
        target="_blank"
        rel="noopener"
        {...stylex.props(styles.link, styles.divided)}
      >
        <span {...stylex.props(styles.label)}>{text.terms}</span>
        <Icon icon={ArrowUpRight} size={20} />
      </a>
    </nav>
  );
}
