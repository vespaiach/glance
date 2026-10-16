import * as stylex from "@stylexjs/stylex";
import { LogOut } from "lucide-react";
import { copy } from "@/copy";
import type { Account } from "@/domain/schemas";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii, shadows, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";

export type SettingsAccount = Pick<Account, "name" | "email">;

type AccountCardProps = {
  account: SettingsAccount;
  onSignOut: () => void;
};

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.lg,
    boxShadow: shadows.shadow1,
    padding: "clamp(20px, 2.4vw, 32px)",
    boxSizing: "border-box",
  },
  person: {
    display: "flex",
    alignItems: "center",
    gap: space.md,
  },
  avatar: {
    width: 56,
    height: 56,
    flexShrink: 0,
    borderRadius: radii.full,
    backgroundColor: season.block4,
    display: "grid",
    placeItems: "center",
    fontSize: 20,
    fontWeight: 540,
    transitionProperty: "background-color",
    transitionDuration: motion.durSeason,
    transitionTimingFunction: motion.easeInOut,
  },
  names: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  name: {
    fontSize: type.headlineSize,
    fontWeight: type.headlineWeight,
    letterSpacing: type.headlineLs,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  email: {
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  signOut: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: `${space.sm} ${space.md}`,
  },
  button: {
    boxShadow: shadows.shadow1,
  },
  caption: {
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
    lineHeight: 1.4,
  },
});

export function AccountCard({ account, onSignOut }: AccountCardProps) {
  const text = copy.settings.account;

  const shownName = account.name ?? account.email;

  return (
    <section aria-label={text.title} {...stylex.props(styles.root)}>
      <Eyebrow>{text.title}</Eyebrow>
      <div {...stylex.props(styles.person)}>
        <span aria-hidden {...stylex.props(styles.avatar)}>
          {shownName.charAt(0)}
        </span>
        <div {...stylex.props(styles.names)}>
          <span {...stylex.props(styles.name)}>{shownName}</span>
          {account.name !== null && <span {...stylex.props(styles.email)}>{account.email}</span>}
        </div>
      </div>
      <div {...stylex.props(styles.signOut)}>
        <Button variant="secondary" icon={LogOut} onClick={onSignOut} xstyle={styles.button}>
          {text.signOut}
        </Button>
        <span {...stylex.props(styles.caption)}>{text.signOutCaption}</span>
      </div>
    </section>
  );
}
