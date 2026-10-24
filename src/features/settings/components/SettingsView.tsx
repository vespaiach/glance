import * as stylex from "@stylexjs/stylex";
import type { AccountCounts } from "@/data/repos";
import type { ShownBackground } from "@/domain/background";
import type { Breakpoint } from "@/domain/breakpoint";
import type { AccountSettings, Season } from "@/domain/schemas";
import type { SignedInScreen } from "@/domain/screens";
import type { PhotoUsage } from "@/domain/storage";
import { space } from "@/theme/tokens.stylex";
import type { DeleteAccountDialog as DeleteAccountState } from "../deleteAccountDialog";
import { settingsLayout } from "../layout";
import type { SignOutDialog as SignOutDialogState } from "../signOutDialog";
import type { ThisPhone } from "../thisPhone";
import { AccountCard, type SettingsAccount } from "./AccountCard";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import type { QrTileShown } from "./QrSignInTile";
import { ScreenOptions } from "./ScreenOptions";
import { SettingsPanel } from "./SettingsPanel";
import { SignOutDialog } from "./SignOutDialog";

type SettingsViewProps = {
  account: SettingsAccount;
  screens: readonly SignedInScreen[];
  storage: PhotoUsage | undefined;
  now: Date;
  tz: string;
  settings: AccountSettings;
  season: Season;
  background: ShownBackground;
  breakpoint: Breakpoint;
  online: boolean;
  qr: QrTileShown;
  onShowQr: () => void;
  onCloseQr: () => void;
  onChange: (change: Partial<AccountSettings>) => void;
  onOpenBackground: () => void;
  onOpenLocation: () => void;
  onOpenAmbient: () => void;
  signOut: SignOutDialogState;
  onSignOut: () => void;
  onSignOutThisDevice: () => void;
  onSignOutAll: () => void;
  onCancelSignOut: () => void;
  deleteAccount: DeleteAccountState;
  counts: AccountCounts | undefined;
  onDeleteAccount: () => void;
  onToggleDeleteAccount: () => void;
  onConfirmDeleteAccount: () => void;
  onCancelDeleteAccount: () => void;
  phone: ThisPhone;
  onAllowPush: () => void;
  onTurnOffPush: () => void;
};

const styles = stylex.create({
  grid: {
    display: "grid",
    gap: space.lg,
    alignItems: "start",
  },
  side: {
    display: "flex",
    flexDirection: "column",
    gap: space.lg,
    minWidth: 0,
  },
});

export function SettingsView({
  account,
  screens,
  storage,
  now,
  tz,
  settings,
  season,
  background,
  breakpoint,
  online,
  qr,
  onShowQr,
  onCloseQr,
  onChange,
  onOpenBackground,
  onOpenLocation,
  onOpenAmbient,
  signOut,
  onSignOut,
  onSignOutThisDevice,
  onSignOutAll,
  onCancelSignOut,
  deleteAccount,
  counts,
  onDeleteAccount,
  onToggleDeleteAccount,
  onConfirmDeleteAccount,
  onCancelDeleteAccount,
  phone,
  onAllowPush,
  onTurnOffPush,
}: SettingsViewProps) {
  return (
    <div {...stylex.props(styles.grid, settingsLayout(breakpoint))}>
      <SettingsPanel
        account={account}
        settings={settings}
        season={season}
        background={background}
        onChange={onChange}
        onOpenBackground={onOpenBackground}
        onOpenLocation={onOpenLocation}
        phone={phone}
        onAllowPush={onAllowPush}
        onTurnOffPush={onTurnOffPush}
      />
      <div {...stylex.props(styles.side)}>
        <ScreenOptions settings={settings} onChange={onChange} onOpenAmbient={onOpenAmbient} />
        <AccountCard
          account={account}
          screens={screens}
          storage={storage}
          now={now}
          tz={tz}
          online={online}
          qr={qr}
          onShowQr={onShowQr}
          onCloseQr={onCloseQr}
          onSignOut={onSignOut}
          onDeleteAccount={onDeleteAccount}
        />
      </div>
      {signOut.kind !== "closed" && (
        <SignOutDialog
          email={account.email}
          online={online}
          state={signOut}
          onThisDevice={onSignOutThisDevice}
          onAllDevices={onSignOutAll}
          onCancel={onCancelSignOut}
        />
      )}
      {deleteAccount.kind !== "closed" && (
        <DeleteAccountDialog
          email={account.email}
          counts={counts}
          screens={screens.length}
          state={deleteAccount}
          onToggle={onToggleDeleteAccount}
          onConfirm={onConfirmDeleteAccount}
          onCancel={onCancelDeleteAccount}
        />
      )}
    </div>
  );
}
