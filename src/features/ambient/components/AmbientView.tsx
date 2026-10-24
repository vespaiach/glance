import * as stylex from "@stylexjs/stylex";
import { Bell, LogOut, MapPin, WifiOff } from "lucide-react";
import type { Ref } from "react";
import { copy } from "@/copy";
import { type AmbientStatus, ambientStatus, driftOffset, driftStep } from "@/domain/ambient";
import { nextNotableDay } from "@/domain/nextNotableDay";
import type { AccountSettings, CalendarEvent, Season, Weather } from "@/domain/schemas";
import { displayTemp } from "@/domain/temperature";
import { type Clock as ClockSetting, clockAt } from "@/domain/time";
import type { ZoneState } from "@/domain/zoneState";
import { conditionText } from "@/features/weather";
import { season as seasonVars } from "@/theme/seasons.stylex";
import { ambientType } from "@/theme/themes";
import { colors, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Clock } from "@/ui/Clock";
import { Icon } from "@/ui/Icon";
import { PhotoBackdrop } from "@/ui/PhotoBackdrop";
import { photoLayer } from "@/ui/photoLayer";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";
import { seasonIcons } from "@/ui/seasonIcons";
import { weatherIcons } from "@/ui/weatherIcons";
import { Zone } from "@/ui/Zone";
import { type NextEventLines, nextEventLines, rainDay } from "../nextEvent";

type Unit = AccountSettings["tempUnit"];

type Brightness = AccountSettings["ambientBrightness"];

type AmbientViewProps = {
  season: Season;
  time: Date;
  clock: ClockSetting;
  tz: string;
  offline: boolean;
  signedOut: boolean;
  place?: string | undefined;
  weather: ZoneState<Weather>;
  unit: Unit;
  nextEvent: ZoneState<CalendarEvent>;
  reminder?: NextEventLines | undefined;
  photoSrc?: string;
  dim: number;
  brightness: Brightness;
  onWake: () => void;
  wakeRef?: Ref<HTMLButtonElement>;
  xstyle?: stylex.StyleXStyles;
};

const STATUS = {
  signedOut: { icon: LogOut, text: copy.ambient.signedOut },
  offline: { icon: WifiOff, text: copy.ambient.offline },
} as const;

const HINT_DELAY = "10s";

const fadeOut = stylex.keyframes({
  from: { opacity: 1 },
  to: { opacity: 0 },
});

const ink = stylex.create({
  full: { color: colors.white },
  medium: { color: colors.ambientInkMedium },
  low: { color: colors.ambientInkLow },
});

const styles = stylex.create({
  root: {
    width: "100%",
    minHeight: "100dvh",
    position: "relative",
    isolation: "isolate",
    margin: 0,
    borderWidth: 0,
    padding: "clamp(32px, 6vw, 96px)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: space.xl,
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "inherit",
    overflow: "hidden",
    backgroundColor: seasonVars.deep,
  },
  row: {
    transitionProperty: "translate",
    transitionDuration: {
      default: "2s",
      "@media (prefers-reduced-motion: reduce)": "0s",
    },
    transitionTimingFunction: "ease-in-out",
  },
  drift: (x: number, y: number) => ({
    translate: `${x}px ${y}px`,
  }),
  top: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px 24px",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontFamily: type.fontMono,
    fontSize: 16,
    letterSpacing: "0.54px",
    textTransform: "uppercase",
  },
  place: {
    minWidth: 0,
  },
  status: {
    gap: space.xs,
  },
  bottom: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "24px 48px",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    paddingTop: 28,
  },
  weather: {
    display: "flex",
    alignItems: "center",
    gap: 20,
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: space.xxs,
  },
  temp: {
    fontSize: "clamp(28px, 3.2vw, 48px)",
    fontWeight: 340,
    letterSpacing: "-0.8px",
    lineHeight: 1.1,
  },
  low: {
    fontSize: 17,
    fontWeight: 330,
    textWrap: "pretty",
  },
  updated: {
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.54px",
    textTransform: "uppercase",
  },
  event: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: space.xs,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: type.fontMono,
    fontSize: 15,
    letterSpacing: "0.54px",
    textTransform: "uppercase",
  },
  bellRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: "clamp(24px, 2.6vw, 40px)",
    fontWeight: 340,
    letterSpacing: "-0.5px",
    lineHeight: 1.15,
    textWrap: "balance",
  },
  sub: {
    fontSize: 17,
    fontWeight: 330,
    textWrap: "pretty",
  },
  hint: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
  },
  hintFade: {
    animationName: fadeOut,
    animationDuration: "1.2s",
    animationDelay: HINT_DELAY,
    animationTimingFunction: "ease",
    animationFillMode: "forwards",
  },
  skeleton: {
    opacity: 0.4,
  },
});

type AmbientWeatherProps = {
  weather: Weather;
  now: Date;
  clock: ClockSetting;
  tz: string;
  unit: Unit;
  offline: boolean;
};

export function AmbientView({
  season,
  time,
  clock,
  tz,
  offline,
  signedOut,
  place,
  weather,
  unit,
  nextEvent,
  reminder,
  photoSrc,
  dim,
  brightness,
  onWake,
  wakeRef,
  xstyle,
}: AmbientViewProps) {
  const { x, y } = driftOffset(driftStep(time));

  const row = [styles.row, styles.drift(x, y)];

  const status = ambientStatus({ signedOut, offline });

  return (
    <button
      ref={wakeRef}
      type="button"
      aria-label={copy.ambient.wake}
      onClick={onWake}
      {...stylex.props(ambientType, styles.root, ink[brightness], xstyle)}
    >
      <PhotoBackdrop image={photoSrc && photoLayer(dim, photoSrc)} />
      <div {...stylex.props(styles.top, row)}>
        <span {...stylex.props(styles.label, styles.place)}>
          <Icon icon={place ? MapPin : seasonIcons[season]} size={24} strokeWidth={1.5} />
          {place ?? copy.season[season]}
        </span>
        {status && <Status status={status} />}
      </div>
      <div {...stylex.props(row)}>
        <Clock time={time} tz={tz} hour12={clock === "12h"} />
      </div>
      <div {...stylex.props(styles.bottom, row)}>
        <Zone
          state={weather}
          loading={<LineSkeleton label={copy.ambient.loadingWeather} />}
          empty={null}
          failed={null}
        >
          {([current]) =>
            current && (
              <AmbientWeather
                weather={current}
                now={time}
                clock={clock}
                tz={tz}
                unit={unit}
                offline={offline}
              />
            )
          }
        </Zone>
        {reminder ? (
          <NextEvent lines={reminder} bell />
        ) : (
          <Zone
            state={nextEvent}
            loading={<LineSkeleton label={copy.ambient.loadingEvent} />}
            empty={<NextEvent lines={nothingLines(place !== undefined)} />}
            failed={null}
          >
            {([event]) => event && <NextEvent lines={nextEventLines(event, time, clock, tz)} />}
          </Zone>
        )}
      </div>
      <span {...stylex.props(styles.hint, styles.hintFade, row)}>
        {signedOut ? copy.ambient.hintSignedOut : copy.ambient.hint}
      </span>
    </button>
  );
}

function lowLine(weather: Weather, now: Date, tz: string, unit: Unit): string {
  const low = copy.ambient.low(displayTemp(weather.current.low, unit));

  const rainy = nextNotableDay(weather.daily, now, tz);

  if (rainy === undefined) return low;

  return `${low} · ${copy.ambient.rain(rainDay(rainy.date, now, tz), rainy.precip ?? 0)}`;
}

function nothingLines(located: boolean): NextEventLines {
  return {
    eyebrow: copy.ambient.nextEvent,
    title: copy.ambient.nothing,
    place: located ? copy.ambient.addEvents : copy.ambient.addEventsAndLocation,
  };
}

function Status({ status }: { status: AmbientStatus }) {
  const { icon, text } = STATUS[status];

  return (
    <span {...stylex.props(styles.label, styles.status)}>
      <Icon icon={icon} size={20} />
      {text}
    </span>
  );
}

function LineSkeleton({ label }: { label: string }) {
  return (
    <Skeleton label={label} xstyle={styles.skeleton}>
      <SkeletonBlock width={240} height={32} />
    </Skeleton>
  );
}

function AmbientWeather({ weather, now, clock, tz, unit, offline }: AmbientWeatherProps) {
  return (
    <div {...stylex.props(styles.weather)}>
      <Icon icon={weatherIcons[weather.current.icon]} size={56} strokeWidth={1.25} />
      <div {...stylex.props(styles.column)}>
        <span {...stylex.props(styles.temp)}>
          {copy.ambient.now(
            displayTemp(weather.current.temp, unit),
            conditionText(weather.current.condition),
          )}
        </span>
        <span {...stylex.props(styles.low)}>{lowLine(weather, now, tz, unit)}</span>
        {offline && (
          <span {...stylex.props(styles.updated)}>
            {copy.ambient.updated(clockAt(weather.fetchedAt, clock, tz))}
          </span>
        )}
      </div>
    </div>
  );
}

function NextEvent({ lines, bell = false }: { lines: NextEventLines; bell?: boolean }) {
  return (
    <div {...stylex.props(styles.event)}>
      <span {...stylex.props(styles.eyebrow, bell && styles.bellRow)}>
        {bell && <Icon icon={Bell} size={20} />}
        {lines.eyebrow}
      </span>
      <span {...stylex.props(styles.title)}>{lines.title}</span>
      {lines.place && <span {...stylex.props(styles.sub)}>{lines.place}</span>}
    </div>
  );
}
