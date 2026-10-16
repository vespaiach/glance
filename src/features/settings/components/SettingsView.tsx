import * as stylex from "@stylexjs/stylex";
import type { ShownBackground } from "@/domain/background";
import type { Breakpoint } from "@/domain/breakpoint";
import type { AccountSettings, Season } from "@/domain/schemas";
import type { SignedInScreen } from "@/domain/screens";
import { space } from "@/theme/tokens.stylex";
import { settingsLayout } from "../layout";
import { AccountCard, type SettingsAccount } from "./AccountCard";
import { ScreenOptions } from "./ScreenOptions";
import { SettingsPanel } from "./SettingsPanel";

type SettingsViewProps = {
  account: SettingsAccount;
  screens: readonly SignedInScreen[];
  now: Date;
  tz: string;
  settings: AccountSettings;
  season: Season;
  background: ShownBackground;
  breakpoint: Breakpoint;
  onChange: (change: Partial<AccountSettings>) => void;
  onOpenBackground: () => void;
  onOpenLocation: () => void;
  onOpenAmbient: () => void;
  onSignOut: () => void;
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
  now,
  tz,
  settings,
  season,
  background,
  breakpoint,
  onChange,
  onOpenBackground,
  onOpenLocation,
  onOpenAmbient,
  onSignOut,
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
      />
      <div {...stylex.props(styles.side)}>
        <ScreenOptions settings={settings} onChange={onChange} onOpenAmbient={onOpenAmbient} />
        <AccountCard account={account} screens={screens} now={now} tz={tz} onSignOut={onSignOut} />
      </div>
    </div>
  );
}
