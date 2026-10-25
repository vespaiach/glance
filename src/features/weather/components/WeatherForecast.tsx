import * as stylex from "@stylexjs/stylex";
import { CloudRain, Droplets, Sun, Sunset, WifiOff, Wind } from "lucide-react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import type { AccountSettings, Weather } from "@/domain/schemas";
import { displayTemp, displayWind } from "@/domain/temperature";
import { type Clock, clockAt, formatHour, formatWeekday, minutesOfDay } from "@/domain/time";
import { rainStart } from "@/domain/weather";
import { dateKey, parseDateKey } from "@/domain/zone";
import { colors, radii, sizes, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Banner } from "@/ui/Banner";
import { ColorBlock } from "@/ui/ColorBlock";
import { Eyebrow } from "@/ui/Eyebrow";
import { ForecastDay } from "@/ui/ForecastDay";
import { Icon } from "@/ui/Icon";
import { type WeatherDetail, WeatherNow } from "@/ui/WeatherNow";
import { weatherIcons } from "@/ui/weatherIcons";
import { conditionText } from "../condition";
import { weatherLayout } from "../layout";

type Unit = AccountSettings["tempUnit"];

type WeatherForecastProps = {
  weather: Weather;
  updatedAt?: string;
  unit: Unit;
  clock: Clock;
  tz: string;
  today: Date;
  stale: boolean;
  breakpoint: Breakpoint;
};

const styles = stylex.create({
  grid: {
    display: "grid",
    gap: space.lg,
  },
  now: {
    justifyContent: "space-between",
    padding: "clamp(24px, 2.6vw, 40px)",
    minWidth: 0,
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: space.lg,
    minWidth: 0,
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.lg,
    padding: space.md,
    boxSizing: "border-box",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space.sm,
  },
  grow: { flexGrow: 1 },
  list: {
    display: "grid",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  hours: { gap: space.xs },
  hour: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    paddingBlock: space.md,
    paddingInline: space.xxs,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space.sm,
    minWidth: 0,
  },
  hourTime: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: "0.6px",
    whiteSpace: "nowrap",
  },
  hourTemp: {
    fontSize: 22,
    fontWeight: 480,
    letterSpacing: "-0.3px",
  },
  days: {
    flexGrow: 1,
    display: "flex",
  },
  dayList: {
    flexGrow: 1,
    gap: space.xxs,
  },
  dayItem: {
    display: "flex",
    minWidth: 0,
  },
  day: {
    flexGrow: 1,
    minWidth: 0,
    paddingBlock: space.md,
    paddingInline: space.xxs,
  },
  attribution: {
    alignSelf: "center",
    display: "inline-flex",
    alignItems: "center",
    minHeight: sizes.touchMin,
    fontFamily: type.fontMono,
    fontSize: 12,
    color: colors.textPrimary,
    textDecorationLine: "underline",
    textUnderlineOffset: 3,
  },
});

type NoticeProps = { weather: Weather; clock: Clock; tz: string; stale: boolean };

type HourlyProps = {
  hourly: Weather["hourly"];
  unit: Unit;
  clock: Clock;
  tz: string;
  xstyle: stylex.StyleXStyles;
};

type DailyProps = {
  daily: Weather["daily"];
  unit: Unit;
  today: string;
  xstyle: stylex.StyleXStyles;
};

export function WeatherForecast({
  weather,
  updatedAt,
  unit,
  clock,
  tz,
  today,
  stale,
  breakpoint,
}: WeatherForecastProps) {
  const layout = weatherLayout(breakpoint);

  const temp = (fahrenheit: number) => displayTemp(fahrenheit, unit);

  const { current } = weather;

  return (
    <div {...stylex.props(styles.grid, layout.grid)}>
      <WeatherNow
        location={nowLabel(weather, updatedAt, clock, tz)}
        temp={temp(current.temp)}
        condition={conditionText(current.condition)}
        icon={current.icon}
        high={temp(current.high)}
        low={temp(current.low)}
        feelsLike={temp(current.feelsLike)}
        details={details(current, unit, clock, tz)}
        labels={copy.weather.range}
        grid
        xstyle={styles.now}
      />
      <div {...stylex.props(styles.panel)}>
        <Notice weather={weather} clock={clock} tz={tz} stale={stale} />
        <Hourly hourly={weather.hourly} unit={unit} clock={clock} tz={tz} xstyle={layout.hourly} />
        <Daily daily={weather.daily} unit={unit} today={dateKey(today, tz)} xstyle={layout.daily} />
      </div>
    </div>
  );
}

function details(
  current: Weather["current"],
  unit: Unit,
  clock: Clock,
  tz: string,
): WeatherDetail[] {
  const labels = copy.weather.details;

  return [
    {
      label: labels.wind,
      value: copy.weather.wind(displayWind(current.windMph, unit), unit, current.windDir),
      icon: Wind,
    },
    { label: labels.humidity, value: copy.weather.percent(current.humidity), icon: Droplets },
    { label: labels.uv, value: String(current.uv), icon: Sun },
    { label: labels.sunset, value: clockAt(current.sunset, clock, tz), icon: Sunset },
  ];
}

function Notice({ weather, clock, tz, stale }: NoticeProps) {
  if (stale) {
    return (
      <Banner
        icon={WifiOff}
        title={copy.weather.offline.title(clockAt(weather.fetchedAt, clock, tz))}
        body={copy.weather.offline.body}
        tone="soft"
      />
    );
  }

  const rain = rainStart(weather.hourly);

  if (rain === undefined) return null;

  return (
    <Banner
      icon={CloudRain}
      title={copy.weather.rain.title(formatHour(minutesOfDay(new Date(rain), tz), clock))}
      body={copy.weather.rain.body}
      tone="soft"
    />
  );
}

function Hourly({ hourly, unit, clock, tz, xstyle }: HourlyProps) {
  return (
    <div {...stylex.props(styles.section)}>
      <Eyebrow>{copy.weather.hourly}</Eyebrow>
      <ul aria-label={copy.weather.hourly} {...stylex.props(styles.list, styles.hours, xstyle)}>
        {hourly.map((point) => (
          <li key={point.time} {...stylex.props(styles.hour)}>
            <span {...stylex.props(styles.hourTime)}>
              {formatHour(minutesOfDay(new Date(point.time), tz), clock)}
            </span>
            <Icon
              icon={weatherIcons[point.icon]}
              size={28}
              strokeWidth={1.5}
              label={copy.weather.icon[point.icon]}
            />
            <span {...stylex.props(styles.hourTemp)}>{displayTemp(point.temp, unit)}°</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Daily({ daily, unit, today, xstyle }: DailyProps) {
  const dayName = (date: string) =>
    date === today ? copy.weather.today : formatWeekday(parseDateKey(date), "UTC");

  return (
    <div {...stylex.props(styles.section, styles.grow)}>
      <Eyebrow>{copy.weather.daily}</Eyebrow>
      <ColorBlock tone="soft" padding="12px" xstyle={styles.days}>
        <ul aria-label={copy.weather.daily} {...stylex.props(styles.list, styles.dayList, xstyle)}>
          {daily.map((day) => (
            <li key={day.date} {...stylex.props(styles.dayItem)}>
              <ForecastDay
                day={dayName(day.date)}
                icon={day.icon}
                iconLabel={copy.weather.icon[day.icon]}
                high={displayTemp(day.high, unit)}
                low={displayTemp(day.low, unit)}
                precip={day.precip}
                active={day.date === today}
                xstyle={styles.day}
              />
            </li>
          ))}
        </ul>
      </ColorBlock>
      <a
        href={copy.weather.attribution.href}
        target="_blank"
        rel="noopener"
        {...stylex.props(styles.attribution)}
      >
        {copy.weather.attribution.text}
      </a>
    </div>
  );
}

function nowLabel(
  weather: Weather,
  updatedAt: string | undefined,
  clock: Clock,
  tz: string,
): string {
  const label = copy.weather.now(weather.location);

  return updatedAt === undefined ? label : copy.zone.updated(label, clockAt(updatedAt, clock, tz));
}
