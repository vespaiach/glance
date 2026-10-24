import * as stylex from "@stylexjs/stylex";
import { Bell, CalendarDays } from "lucide-react";
import { useId } from "react";
import { copy } from "@/copy";
import type { ShownBackground } from "@/domain/background";
import type { AccountSettings, Season } from "@/domain/schemas";
import { colors, radii, shadows, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { PillTabs } from "@/ui/PillTabs";
import { Radio } from "@/ui/Radio";
import { SettingsRow } from "@/ui/SettingsRow";
import { seasonIcons } from "@/ui/seasonIcons";
import { locationSummary } from "../location";
import type { ThisPhone } from "../thisPhone";
import type { SettingsAccount } from "./AccountCard";

type SettingsPanelProps = {
  account: SettingsAccount;
  settings: AccountSettings;
  season: Season;
  background: ShownBackground;
  onChange: (change: Partial<AccountSettings>) => void;
  onOpenBackground: () => void;
  onOpenLocation: () => void;
  phone: ThisPhone;
  onAllowPush: () => void;
  onTurnOffPush: () => void;
};

const SEASON_OPTIONS = [
  { value: "auto" as const, label: copy.settings.season.autoLabel, icon: CalendarDays },
  ...(["spring", "summer", "fall", "winter"] as const).map((value) => ({
    value,
    label: copy.season[value],
    icon: seasonIcons[value],
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
  section: {
    paddingTop: space.md,
  },
  phoneOn: {
    display: "flex",
    alignItems: "center",
    gap: space.sm,
    fontSize: type.headlineSize,
    fontWeight: type.headlineWeight,
  },
  ring: {
    boxShadow: shadows.shadow1,
  },
  blocked: {
    maxWidth: 360,
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
    textWrap: "pretty",
  },
});

export function SettingsPanel({
  account,
  settings,
  season,
  background,
  onChange,
  onOpenBackground,
  onOpenLocation,
  phone,
  onAllowPush,
  onTurnOffPush,
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
          title={text.location.title}
          description={text.location.body}
          onClick={onOpenLocation}
        >
          {locationSummary(settings.weatherLocation)}
        </SettingsRow>
        <SettingsRow
          title={text.season.title}
          description={seasonSubtitle(settings.season, season)}
          align="start"
        >
          <Radio
            label={text.season.title}
            options={SEASON_OPTIONS}
            value={settings.season}
            onChange={(value) => onChange({ season: value })}
            direction="column"
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
          <Radio
            label={text.clock.title}
            options={text.clock.options}
            value={settings.clock}
            onChange={(value) => onChange({ clock: value })}
          />
        </SettingsRow>
        <SettingsRow title={text.temperature.title} description={text.temperature.body}>
          <Radio
            label={text.temperature.title}
            options={text.temperature.options}
            value={settings.tempUnit}
            onChange={(value) => onChange({ tempUnit: value })}
          />
        </SettingsRow>
        <SettingsRow
          title={text.hideSidebar.title}
          description={text.hideSidebar.body}
          checked={settings.hideSidebarWhenIdle}
          onCheckedChange={(checked) => onChange({ hideSidebarWhenIdle: checked })}
          divider={false}
        />
      </div>
      <NotificationsSection
        settings={settings}
        onChange={onChange}
        phone={phone}
        onAllowPush={onAllowPush}
        onTurnOffPush={onTurnOffPush}
      />
    </div>
  );
}

function NotificationsSection({
  settings,
  onChange,
  phone,
  onAllowPush,
  onTurnOffPush,
}: Pick<SettingsPanelProps, "settings" | "onChange" | "phone" | "onAllowPush" | "onTurnOffPush">) {
  const text = copy.settings.notifications;

  const heading = useId();

  return (
    <section aria-labelledby={heading} {...stylex.props(styles.rows, styles.section)}>
      <Eyebrow>
        <span id={heading}>{text.title}</span>
      </Eyebrow>
      <SettingsRow title={text.defaultReminder}>
        <PillTabs
          label={text.defaultReminder}
          options={copy.reminder.options}
          value={settings.defaultReminder}
          onChange={(value) => onChange({ defaultReminder: value })}
        />
      </SettingsRow>
      <SettingsRow
        title={text.chime}
        description={text.chimeBody}
        checked={settings.chime}
        onCheckedChange={(checked) => onChange({ chime: checked })}
        divider={phone.kind !== "unsupported"}
      />
      {phone.kind !== "unsupported" && (
        <SettingsRow title={text.thisPhone} description={text.thisPhoneBody} divider={false}>
          <ThisPhoneControl phone={phone} onAllow={onAllowPush} onTurnOff={onTurnOffPush} />
        </SettingsRow>
      )}
    </section>
  );
}

function ThisPhoneControl({
  phone,
  onAllow,
  onTurnOff,
}: {
  phone: Exclude<ThisPhone, { kind: "unsupported" }>;
  onAllow: () => void;
  onTurnOff: () => void;
}) {
  const text = copy.settings.notifications;

  switch (phone.kind) {
    case "ask":
    case "asking":
      return (
        <Button
          variant="secondary"
          icon={Bell}
          disabled={phone.kind === "asking"}
          onClick={onAllow}
          xstyle={styles.ring}
        >
          {text.allow}
        </Button>
      );
    case "denied":
      return <span {...stylex.props(styles.blocked)}>{text.blocked}</span>;
    case "on":
    case "turning-off":
      return (
        <span {...stylex.props(styles.phoneOn)}>
          {text.on}
          <Button variant="ghost" disabled={phone.kind === "turning-off"} onClick={onTurnOff}>
            {text.turnOff}
          </Button>
        </span>
      );
  }
}

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
