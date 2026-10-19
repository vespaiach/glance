import * as stylex from "@stylexjs/stylex";
import { CloudOff, CloudSun, type LucideIcon, Umbrella } from "lucide-react";
import { copy } from "@/copy";
import type { AccountSettings, Weather } from "@/domain/schemas";
import { displayTemp } from "@/domain/temperature";
import { type Clock, clockAt, formatHour, minutesOfDay } from "@/domain/time";
import { rainHour } from "@/domain/weather";
import type { ZoneState } from "@/domain/zoneState";
import { conditionText } from "@/features/weather";
import { radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { press } from "@/ui/press";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";
import { weatherIcons } from "@/ui/weatherIcons";
import { Zone } from "@/ui/Zone";

type NowWeatherProps = {
  state: ZoneState<Weather>;
  retryIn: number;
  unit: AccountSettings["tempUnit"];
  clock: Clock;
  tz: string;
  onOpenWeather: () => void;
  onSetLocation: () => void;
};

type ReadingProps = {
  weather: Weather;
  updatedAt: string | undefined;
  unit: AccountSettings["tempUnit"];
  clock: Clock;
  tz: string;
  onOpen: () => void;
};

type MessageProps = {
  icon: LucideIcon;
  title: string;
  body: string;
};

const styles = stylex.create({
  button: {
    borderWidth: 0,
    backgroundColor: "transparent",
    padding: 0,
    font: "inherit",
    color: "inherit",
    textAlign: "start",
    cursor: "pointer",
  },
  reading: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minWidth: 0,
  },
  now: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  temp: {
    fontSize: "clamp(48px, 17cqi, 128px)",
    fontWeight: 300,
    lineHeight: 1,
    letterSpacing: "-0.04em",
    fontVariantNumeric: "tabular-nums",
  },
  lines: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  summary: {
    fontSize: type.bodyLgSize,
    fontWeight: 330,
    lineHeight: 1.3,
  },
  rain: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: type.bodyLgSize,
    fontWeight: 480,
    lineHeight: 1.3,
  },
  message: {
    minHeight: 56,
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  messageText: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  messageTitle: {
    fontSize: type.headlineSize,
    fontWeight: 540,
    lineHeight: 1.25,
  },
  messageBody: {
    fontSize: type.bodySize,
    fontWeight: 330,
  },
  skeleton: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
});

export function NowWeather({
  state,
  retryIn,
  unit,
  clock,
  tz,
  onOpenWeather,
  onSetLocation,
}: NowWeatherProps) {
  return (
    <Zone
      state={state}
      loading={<NowWeatherSkeleton />}
      empty={
        <button
          type="button"
          onClick={onSetLocation}
          {...stylex.props(styles.button, styles.message, press.scale)}
        >
          <Message
            icon={CloudSun}
            title={copy.today.weather.setTitle}
            body={copy.today.weather.setBody}
          />
        </button>
      }
      failed={
        <div {...stylex.props(styles.message)}>
          <Message
            icon={CloudOff}
            title={copy.today.unavailable.weather}
            body={copy.today.weather.failedBody(retryIn)}
          />
        </div>
      }
    >
      {([weather], updatedAt) =>
        weather && (
          <Reading
            weather={weather}
            updatedAt={updatedAt}
            unit={unit}
            clock={clock}
            tz={tz}
            onOpen={onOpenWeather}
          />
        )
      }
    </Zone>
  );
}

function Reading({ weather, updatedAt, unit, clock, tz, onOpen }: ReadingProps) {
  const temp = (fahrenheit: number) => displayTemp(fahrenheit, unit);

  const rain = rainHour(weather.hourly);

  return (
    <button
      type="button"
      aria-label={copy.today.weather.name}
      onClick={onOpen}
      {...stylex.props(styles.button, styles.reading, press.scale)}
    >
      <Eyebrow>{placeLabel(weather, updatedAt, clock, tz)}</Eyebrow>
      <span {...stylex.props(styles.now)}>
        <Icon icon={weatherIcons[weather.current.icon]} size={64} strokeWidth={1.25} />
        <span {...stylex.props(styles.temp)}>{`${temp(weather.current.temp)}°`}</span>
      </span>
      <span {...stylex.props(styles.lines)}>
        <span {...stylex.props(styles.summary)}>
          {copy.today.weather.summary(
            conditionText(weather.current.condition),
            temp(weather.current.high),
            temp(weather.current.low),
          )}
        </span>
        {rain && (
          <span {...stylex.props(styles.rain)}>
            <Icon icon={Umbrella} size={20} />
            {copy.today.weather.rainFrom(formatHour(minutesOfDay(new Date(rain), tz), clock))}
          </span>
        )}
      </span>
    </button>
  );
}

function Message({ icon, title, body }: MessageProps) {
  return (
    <>
      <Icon icon={icon} size={40} strokeWidth={1.25} />
      <span {...stylex.props(styles.messageText)}>
        <span {...stylex.props(styles.messageTitle)}>{title}</span>
        <span {...stylex.props(styles.messageBody)}>{body}</span>
      </span>
    </>
  );
}

function NowWeatherSkeleton() {
  return (
    <Skeleton label={copy.today.weather.loading} xstyle={styles.skeleton}>
      <SkeletonBlock width={120} height={14} />
      <SkeletonBlock width={200} height={72} radius={radii.md} />
      <SkeletonBlock width="70%" height={18} />
    </Skeleton>
  );
}

function placeLabel(
  weather: Weather,
  updatedAt: string | undefined,
  clock: Clock,
  tz: string,
): string {
  if (updatedAt === undefined) return copy.today.weather.now(weather.location);

  return copy.zone.updated(weather.location, clockAt(updatedAt, clock, tz));
}
