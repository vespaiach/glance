import * as stylex from "@stylexjs/stylex";
import {
  Info,
  LogOut,
  type LucideIcon,
  Monitor,
  QrCode,
  Smartphone,
  Tablet,
  Trash2,
} from "lucide-react";
import { copy } from "@/copy";
import type { Account } from "@/domain/schemas";
import { activeStamp, type DeviceKind, type SignedInScreen } from "@/domain/screens";
import type { PhotoUsage } from "@/domain/storage";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii, shadows, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { QrSignInTile, type QrTileShown } from "./QrSignInTile";
import { StorageMeter } from "./StorageMeter";

export type SettingsAccount = Pick<Account, "name" | "email">;

type AccountCardProps = {
  account: SettingsAccount;
  screens: readonly SignedInScreen[];
  storage: PhotoUsage | undefined;
  now: Date;
  tz: string;
  online: boolean;
  qr: QrTileShown;
  onShowQr: () => void;
  onCloseQr: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
};

const DEVICE_ICONS: Record<DeviceKind, LucideIcon> = {
  monitor: Monitor,
  tablet: Tablet,
  smartphone: Smartphone,
};

const text = copy.settings.account;

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
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
  screens: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: space.xs,
  },
  list: {
    alignSelf: "stretch",
    display: "flex",
    flexDirection: "column",
    margin: 0,
    padding: `0 ${space.md}`,
    listStyle: "none",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: space.md,
    minHeight: 64,
    padding: "10px 0",
    boxSizing: "border-box",
  },
  divided: {
    boxShadow: `inset 0 1px 0 ${colors.borderHairlineSoft}`,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceCanvas,
    display: "grid",
    placeItems: "center",
  },
  device: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flexGrow: 1,
    minWidth: 0,
  },
  deviceName: {
    fontSize: 17,
    fontWeight: 540,
    letterSpacing: "-0.1px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  thisDot: {
    width: 10,
    height: 10,
    flexShrink: 0,
    borderRadius: radii.full,
    backgroundColor: season.accent,
  },
  signOut: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: `${space.sm} ${space.md}`,
    paddingTop: space.md,
    boxShadow: `inset 0 1px 0 ${colors.borderHairlineSoft}`,
  },
  note: {
    display: "flex",
    alignItems: "center",
    gap: space.xs,
    minWidth: 0,
  },
  noteIcon: {
    display: "flex",
    flexShrink: 0,
  },
  button: {
    boxShadow: shadows.shadow1,
  },
  deleteText: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 240,
  },
  deleteTitle: {
    fontSize: 17,
    fontWeight: 540,
    letterSpacing: "-0.1px",
  },
  deleteCaption: {
    fontSize: 15,
    fontWeight: 330,
    lineHeight: 1.4,
    textWrap: "pretty",
  },
  danger: {
    color: colors.danger,
  },
});

export function AccountCard({
  account,
  screens,
  storage,
  now,
  tz,
  online,
  qr,
  onShowQr,
  onCloseQr,
  onSignOut,
  onDeleteAccount,
}: AccountCardProps) {
  const shownName = account.name ?? account.email;

  const count = text.screensSignedIn(screens.length);

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
      {storage && online && <StorageMeter usage={storage} />}
      <div {...stylex.props(styles.screens)}>
        <Eyebrow>{count}</Eyebrow>
        <ul aria-label={count} {...stylex.props(styles.list)}>
          {screens.map((screen, index) => (
            <ScreenRow key={screen.id} screen={screen} divided={index > 0} now={now} tz={tz} />
          ))}
        </ul>
        <QrSignIn
          email={account.email}
          online={online}
          qr={qr}
          onShowQr={onShowQr}
          onCloseQr={onCloseQr}
        />
      </div>
      <div {...stylex.props(styles.signOut)}>
        <div {...stylex.props(styles.note)}>
          <span {...stylex.props(styles.noteIcon)}>
            <Icon icon={Info} size={18} />
          </span>
          <Eyebrow size="caption">{text.signOutCaption}</Eyebrow>
        </div>
        <Button variant="secondary" icon={LogOut} onClick={onSignOut} xstyle={styles.button}>
          {text.signOut}
        </Button>
      </div>
      <div {...stylex.props(styles.signOut)}>
        <div {...stylex.props(styles.deleteText)}>
          <span {...stylex.props(styles.deleteTitle)}>{text.deleteAccount.title}</span>
          <span {...stylex.props(styles.deleteCaption)}>{text.deleteAccount.caption}</span>
        </div>
        <Button
          variant="secondary"
          icon={Trash2}
          disabled={!online}
          onClick={onDeleteAccount}
          xstyle={[styles.button, styles.danger]}
        >
          {text.deleteAccount.title}
        </Button>
      </div>
    </section>
  );
}

function screenCaption(screen: SignedInScreen, now: Date, tz: string): string {
  return screen.current ? text.thisScreen : text.active(activeStamp(screen.lastSeenAt, now, tz));
}

function ScreenRow({
  screen,
  divided,
  now,
  tz,
}: {
  screen: SignedInScreen;
  divided: boolean;
  now: Date;
  tz: string;
}) {
  return (
    <li {...stylex.props(styles.row, divided && styles.divided)}>
      <span {...stylex.props(styles.deviceIcon)}>
        <Icon icon={DEVICE_ICONS[screen.kind]} size={20} label={text.deviceKind(screen.kind)} />
      </span>
      <div {...stylex.props(styles.device)}>
        <span {...stylex.props(styles.deviceName)}>{text.screenName(screen)}</span>
        <Eyebrow size="caption">{screenCaption(screen, now, tz)}</Eyebrow>
      </div>
      {screen.current && <span aria-hidden {...stylex.props(styles.thisDot)} />}
    </li>
  );
}

function QrSignIn({
  email,
  online,
  qr,
  onShowQr,
  onCloseQr,
}: Pick<AccountCardProps, "online" | "qr" | "onShowQr" | "onCloseQr"> & { email: string }) {
  if (qr.tile.kind === "closed") {
    return (
      <Button
        variant="secondary"
        icon={QrCode}
        disabled={!online}
        onClick={onShowQr}
        xstyle={styles.button}
      >
        {text.qr.show}
      </Button>
    );
  }

  return (
    <QrSignInTile {...qr} email={email} online={online} onRetry={onShowQr} onClose={onCloseQr} />
  );
}
