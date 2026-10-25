import * as stylex from "@stylexjs/stylex";
import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { copy } from "@/copy";
import { colors, radii, sizes, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";

const pulse = stylex.keyframes({
  from: { opacity: 1 },
  to: { opacity: 0.55 },
});

const styles = stylex.create({
  heading: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: type.displayXlSize,
    fontWeight: 340,
    letterSpacing: "-1px",
    lineHeight: 1.05,
  },
  body: {
    margin: 0,
    fontSize: 18,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  strong: { fontWeight: 540 },
  tile: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    paddingBlock: space.md,
    paddingInline: 20,
  },
  icon: { display: "flex", flexShrink: 0 },
  switchTile: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: -16,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    paddingBlock: space.md,
    paddingInline: 20,
  },
  switchRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  },
  switchText: {
    minWidth: 0,
    fontSize: 16,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
    overflowWrap: "anywhere",
  },
  switchAction: {
    display: "flex",
    marginLeft: 18,
  },
  pulse: {
    animationName: pulse,
    animationDuration: "1.2s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
    animationDirection: "alternate",
  },
  tileText: {
    minWidth: 0,
    fontSize: 16,
    fontWeight: 330,
    overflowWrap: "anywhere",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  ruled: {
    paddingTop: space.lg,
    boxShadow: `inset 0 1px 0 ${colors.borderHairlineSoft}`,
  },
  lock: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    paddingTop: space.lg,
    boxShadow: `inset 0 1px 0 ${colors.borderHairlineSoft}`,
    fontSize: 15,
    fontWeight: 330,
    lineHeight: 1.45,
  },
  terms: {
    marginTop: -16,
    fontSize: 15,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  termsLink: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: sizes.touchMin,
    color: colors.textPrimary,
    fontWeight: 540,
    textDecorationLine: "underline",
    textUnderlineOffset: 3,
  },
});

export function Heading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div {...stylex.props(styles.heading)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 {...stylex.props(styles.title)}>{title}</h1>
      {children && <p {...stylex.props(styles.body)}>{children}</p>}
    </div>
  );
}

export function Email({ before, email, after }: { before: string; email: string; after: string }) {
  return (
    <>
      {before}
      <strong {...stylex.props(styles.strong)}>{email}</strong>
      {after}
    </>
  );
}

export function StatusTile({
  icon,
  pulsing = false,
  children,
}: {
  icon: LucideIcon;
  pulsing?: boolean;
  children: ReactNode;
}) {
  return (
    <div role="status" {...stylex.props(styles.tile)}>
      <span {...stylex.props(styles.icon, pulsing && styles.pulse)}>
        <Icon icon={icon} size={22} />
      </span>
      <span {...stylex.props(styles.tileText)}>{children}</span>
    </div>
  );
}

export function SwitchTile({
  icon,
  action,
  children,
}: {
  icon: LucideIcon;
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <div role="status" {...stylex.props(styles.switchTile)}>
      <div {...stylex.props(styles.switchRow)}>
        <span {...stylex.props(styles.icon)}>
          <Icon icon={icon} size={22} />
        </span>
        <span {...stylex.props(styles.switchText)}>{children}</span>
      </div>
      <div {...stylex.props(styles.switchAction)}>{action}</div>
    </div>
  );
}

export function Actions({ ruled = false, children }: { ruled?: boolean; children: ReactNode }) {
  return <div {...stylex.props(styles.actions, ruled && styles.ruled)}>{children}</div>;
}

export function LockFooter() {
  return (
    <div {...stylex.props(styles.lock)}>
      <span {...stylex.props(styles.icon)}>
        <Icon icon={Lock} size={18} />
      </span>
      <span>{copy.signIn.lock}</span>
    </div>
  );
}

export function TermsLine() {
  return (
    <div {...stylex.props(styles.terms)}>
      {copy.signIn.terms.before}
      <a href="/terms" target="_blank" rel="noopener" {...stylex.props(styles.termsLink)}>
        {copy.signIn.terms.link}
      </a>
      {copy.signIn.terms.after}
    </div>
  );
}

export function GuideLine() {
  return (
    <div {...stylex.props(styles.terms)}>
      {copy.signIn.guide.before}
      <a href="/guide" target="_blank" rel="noopener" {...stylex.props(styles.termsLink)}>
        {copy.signIn.guide.link}
      </a>
      {copy.signIn.guide.after}
    </div>
  );
}
