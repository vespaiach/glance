import * as stylex from "@stylexjs/stylex";
import { Clock as ClockIcon, CloudSun, type LucideIcon, MapPin, MapPinOff } from "lucide-react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import type { WeatherLocation } from "@/domain/schemas";
import { type Clock, clockAt } from "@/domain/time";
import { timeZoneName } from "@/domain/zoneName";
import { PlaceForm, type WeatherSetupFlow } from "@/features/weather";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { BackLink } from "@/ui/BackLink";
import { ColorBlock } from "@/ui/ColorBlock";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { settingsLayout } from "../layout";
import { placeLabel } from "../location";
import { ZoneConfirm, type ZoneExample } from "./ZoneConfirm";

type LocationViewProps = {
  location: WeatherLocation | undefined;
  now: Date;
  clock: Clock;
  setup: WeatherSetupFlow;
  example?: ZoneExample | undefined;
  breakpoint: Breakpoint;
  onBack: () => void;
};

const styles = stylex.create({
  grid: {
    display: "grid",
    gap: space.lg,
    alignItems: "start",
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: space.lg,
    minWidth: 0,
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.lg,
    padding: "clamp(20px, 2.6vw, 40px)",
    boxSizing: "border-box",
  },
  title: {
    margin: 0,
    fontSize: type.displayXlSize,
    fontWeight: type.displayXlWeight,
    letterSpacing: type.displayXlLs,
    lineHeight: type.displayXlLh,
  },
  current: {
    display: "flex",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    padding: 20,
  },
  icon: {
    display: "flex",
    flex: "none",
  },
  currentText: {
    display: "flex",
    flexDirection: "column",
    gap: space.xxs,
    minWidth: 0,
  },
  place: {
    fontSize: 28,
    fontWeight: 340,
    letterSpacing: "-0.4px",
    lineHeight: 1.15,
  },
  line: {
    fontSize: 16,
    fontWeight: 330,
    textWrap: "pretty",
  },
  change: {
    display: "flex",
    flexDirection: "column",
    gap: space.sm,
  },
  card: {
    boxShadow: `inset 0 0 0 1px ${colors.borderHairline}`,
  },
  sets: {
    display: "flex",
    flexDirection: "column",
    gap: space.lg,
  },
  tiles: {
    display: "flex",
    flexDirection: "column",
    gap: space.sm,
  },
  tile: {
    display: "flex",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.md,
    paddingBlock: space.md,
    paddingInline: 20,
  },
  tileTitle: {
    fontSize: type.headlineSize,
    fontWeight: type.headlineWeight,
    letterSpacing: type.headlineLs,
  },
  tileBody: {
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
    textWrap: "pretty",
  },
  caption: {
    fontSize: 16,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  shared: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
  },
});

type CurrentProps = Pick<LocationViewProps, "location" | "now" | "clock">;

export function LocationView({
  location,
  now,
  clock,
  setup,
  example,
  breakpoint,
  onBack,
}: LocationViewProps) {
  const { state } = setup;

  return (
    <div {...stylex.props(styles.grid, settingsLayout(breakpoint))}>
      <BackLink label={copy.location.back} onBack={onBack} />
      <div {...stylex.props(styles.panel)}>
        <h2 {...stylex.props(styles.title)}>{copy.location.title}</h2>
        <Current location={location} now={now} clock={clock} />
        {state.step === "confirm-zone" && location?.timeZone ? (
          <ZoneConfirm
            place={state.place}
            from={location.timeZone}
            now={now}
            clock={clock}
            example={example}
            onConfirm={setup.confirm}
            onKeep={setup.keep}
          />
        ) : (
          <Change located={location !== undefined} setup={setup} />
        )}
      </div>
      <WhatItSets zone={location?.timeZone} />
    </div>
  );
}

function zoneLine({ location, now, clock }: CurrentProps): string {
  const zone = location?.timeZone;

  if (!zone) return copy.location.deviceClock;

  return copy.location.zoneNow(timeZoneName(zone), clockAt(now.toISOString(), clock, zone));
}

function Current(props: CurrentProps) {
  const { location } = props;

  return (
    <div {...stylex.props(styles.current)}>
      <span {...stylex.props(styles.icon)}>
        <Icon icon={location ? MapPin : MapPinOff} size={28} strokeWidth={1.5} />
      </span>
      <div {...stylex.props(styles.currentText)}>
        <Eyebrow>{copy.location.nowSetTo}</Eyebrow>
        <span {...stylex.props(styles.place)}>
          {location ? placeLabel(location) : copy.location.notSet}
        </span>
        <span {...stylex.props(styles.line)}>{zoneLine(props)}</span>
      </div>
    </div>
  );
}

function Change({ located, setup }: { located: boolean; setup: WeatherSetupFlow }) {
  return (
    <div {...stylex.props(styles.change)}>
      <Eyebrow>{located ? copy.location.change : copy.location.set}</Eyebrow>
      <PlaceForm
        state={setup.state}
        canLocate={setup.canLocate}
        submitLabel={copy.location.search}
        onType={setup.type}
        onSubmit={setup.submit}
        onPick={setup.pick}
        onLocate={setup.locate}
        xstyle={styles.card}
      />
    </div>
  );
}

function SetsTile({ icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div {...stylex.props(styles.tile)}>
      <span {...stylex.props(styles.icon)}>
        <Icon icon={icon} size={28} strokeWidth={1.5} />
      </span>
      <div {...stylex.props(styles.currentText)}>
        <span {...stylex.props(styles.tileTitle)}>{title}</span>
        <span {...stylex.props(styles.tileBody)}>{body}</span>
      </div>
    </div>
  );
}

function WhatItSets({ zone }: { zone: string | undefined }) {
  const text = copy.location;

  const name = zone && timeZoneName(zone);

  return (
    <ColorBlock tone="soft" padding="clamp(20px, 2.4vw, 32px)" xstyle={styles.sets}>
      <Eyebrow>{text.sets}</Eyebrow>
      <div {...stylex.props(styles.tiles)}>
        <SetsTile icon={CloudSun} title={text.weather.title} body={text.weather.body} />
        <SetsTile
          icon={ClockIcon}
          title={text.timeZone.title}
          body={name ? text.timeZone.zoned(name) : text.timeZone.unset}
        />
      </div>
      <div {...stylex.props(styles.caption)}>{name ? text.caption(name) : text.captionUnset}</div>
      <span {...stylex.props(styles.shared)}>{text.shared}</span>
    </ColorBlock>
  );
}
