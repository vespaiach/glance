import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import type { ShownBackground } from "@/domain/background";
import type { AccountSettings, Season } from "@/domain/schemas";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Eyebrow } from "@/ui/Eyebrow";
import { PillTabs } from "@/ui/PillTabs";
import { SettingsRow } from "@/ui/SettingsRow";
import type { SettingsAccount } from "./AccountCard";

type SettingsPanelProps = {
  account: SettingsAccount;
  settings: AccountSettings;
  season: Season;
  background: ShownBackground;
  onChange: (change: Partial<AccountSettings>) => void;
  onOpenBackground: () => void;
};

const SEASON_OPTIONS = [
  { value: "auto" as const, label: copy.settings.season.autoLabel },
  ...(["spring", "summer", "fall", "winter"] as const).map((value) => ({
    value,
    label: copy.season[value],
  })),
];

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space.md,
    minWidth: 0,
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.lg,
    padding: "clamp(20px, 2.6vw, 40px)",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
  },
  title: {
    margin: 0,
    fontSize: type.displayXlSize,
    fontWeight: type.displayXlWeight,
    letterSpacing: type.displayXlLs,
    lineHeight: type.displayXlLh,
  },
  signedIn: {
    fontSize: 17,
    fontWeight: 330,
  },
  name: {
    fontWeight: 540,
  },
  rows: {
    display: "flex",
    flexDirection: "column",
  },
  tabs: {
    backgroundColor: colors.surfaceSoft,
  },
});

function seasonSubtitle(setting: AccountSettings["season"], season: Season): string {
  const name = copy.season[season];

  return setting === "auto"
    ? copy.settings.season.following(name)
    : copy.settings.season.fixed(name);
}

function backgroundSummary(background: ShownBackground): string {
  const text = copy.settings.background;

  switch (background.mode) {
    case "season":
      return text.season;
    case "photo":
      return text.photo(background.photo.title);
    case "slideshow":
      return text.slideshow(copy.background.interval[background.rotate]);
  }
}

function SignedIn({ account }: { account: SettingsAccount }) {
  return (
    <span {...stylex.props(styles.signedIn)}>
      {copy.settings.signedInAs}{" "}
      {account.name === null ? (
        account.email
      ) : (
        <>
          <span {...stylex.props(styles.name)}>{account.name}</span>
          {copy.settings.signedInEmail(account.email)}
        </>
      )}
    </span>
  );
}

export function SettingsPanel({
  account,
  settings,
  season,
  background,
  onChange,
  onOpenBackground,
}: SettingsPanelProps) {
  const text = copy.settings;

  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.header)}>
        <Eyebrow>{text.eyebrow}</Eyebrow>
        <h2 {...stylex.props(styles.title)}>{text.title}</h2>
        <SignedIn account={account} />
      </div>
      <div {...stylex.props(styles.rows)}>
        <SettingsRow
          title={text.season.title}
          description={seasonSubtitle(settings.season, season)}
        >
          <PillTabs
            label={text.season.title}
            options={SEASON_OPTIONS}
            value={settings.season}
            onChange={(value) => onChange({ season: value })}
            xstyle={styles.tabs}
          />
        </SettingsRow>
        <SettingsRow
          title={text.background.title}
          description={text.background.body}
          onClick={onOpenBackground}
        >
          {backgroundSummary(background)}
        </SettingsRow>
        <SettingsRow title={text.clock.title} description={text.clock.body}>
          <PillTabs
            label={text.clock.title}
            options={text.clock.options}
            value={settings.clock}
            onChange={(value) => onChange({ clock: value })}
            xstyle={styles.tabs}
          />
        </SettingsRow>
        <SettingsRow
          title={text.temperature.title}
          description={text.temperature.body}
          divider={false}
        >
          <PillTabs
            label={text.temperature.title}
            options={text.temperature.options}
            value={settings.tempUnit}
            onChange={(value) => onChange({ tempUnit: value })}
            xstyle={styles.tabs}
          />
        </SettingsRow>
      </div>
    </div>
  );
}
