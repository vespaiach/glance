import * as stylex from "@stylexjs/stylex";
import { WifiOff } from "lucide-react";
import { copy } from "@/copy";
import { isTomorrow } from "@/domain/ambient";
import { nextNotableDay } from "@/domain/nextNotableDay";
import type { AccountSettings, CalendarEvent, Season, Weather } from "@/domain/schemas";
import { displayTemp } from "@/domain/temperature";
import {
  type Clock as ClockSetting,
  formatClock,
  formatMonth,
  formatMonthDay,
  formatWeekday,
  minutesOfDay,
  parseLocalDate,
} from "@/domain/time";
import type { ZoneState } from "@/domain/zoneState";
import { conditionText } from "@/features/weather";
import { season as seasonVars } from "@/theme/seasons.stylex";
import { ambientType } from "@/theme/themes";
import { space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Clock } from "@/ui/Clock";
import { Icon } from "@/ui/Icon";
import { PhotoBackdrop } from "@/ui/PhotoBackdrop";
import { photoLayer } from "@/ui/photoLayer";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";
import { seasonIcons } from "@/ui/seasonIcons";
import { weatherIcons } from "@/ui/weatherIcons";
import { Zone } from "@/ui/Zone";

type Unit = AccountSettings["tempUnit"];

type AmbientViewProps = {
  season: Season;
  time: Date;
  clock: ClockSetting;
  offline: boolean;
  weather: ZoneState<Weather>;
  unit: Unit;
  nextEvent: ZoneState<CalendarEvent>;
  photoSrc?: string;
  dim: number;
  onWake: () => void;
  xstyle?: stylex.StyleXStyles;
};

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
    backgroundColor: seasonVars.deep,
    color: seasonVars.onDeep,
  },
  top: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.md,
  },
  topEnd: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.lg,
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontFamily: type.fontMono,
    fontSize: 16,
    letterSpacing: "0.54px",
    textTransform: "uppercase",
  },
  offline: {
    gap: space.xs,
  },
  bottom: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: space.lg,
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
  },
  event: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: space.xs,
  },
  eyebrow: {
    fontFamily: type.fontMono,
    fontSize: 15,
    letterSpacing: "0.54px",
    textTransform: "uppercase",
  },
  next: {
    fontSize: "clamp(22px, 2.2vw, 32px)",
    fontWeight: 340,
    letterSpacing: "-0.4px",
    lineHeight: 1.2,
  },
  caption: {
    fontFamily: type.fontMono,
    fontSize: 13,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
  },
  skeleton: {
    opacity: 0.4,
  },
});

function lowLine(weather: Weather, now: Date, unit: Unit): string {
  const low = copy.ambient.low(displayTemp(weather.current.low, unit));

  const rainy = nextNotableDay(weather.daily, now);

  if (rainy === undefined) return low;

  return `${low} · ${copy.ambient.rain(formatWeekday(parseLocalDate(rainy.date)), rainy.precip ?? 0)}`;
}

function eventLine(event: CalendarEvent, now: Date, clock: ClockSetting): string {
  const start = new Date(event.startAt);

  const day = isTomorrow(start, now)
    ? copy.ambient.tomorrow
    : copy.ambient.day(formatWeekday(start), formatMonthDay(start));

  return copy.ambient.event(
    day,
    formatClock(minutesOfDay(start), clock),
    event.title,
    event.location,
  );
}

function LineSkeleton({ label }: { label: string }) {
  return (
    <Skeleton label={label} xstyle={styles.skeleton}>
      <SkeletonBlock width={240} height={32} />
    </Skeleton>
  );
}

function AmbientWeather({ weather, now, unit }: { weather: Weather; now: Date; unit: Unit }) {
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
        <span {...stylex.props(styles.low)}>{lowLine(weather, now, unit)}</span>
      </div>
    </div>
  );
}

function NextEvent({ children }: { children: string }) {
  return <span {...stylex.props(styles.next)}>{children}</span>;
}

export function AmbientView({
  season,
  time,
  clock,
  offline,
  weather,
  unit,
  nextEvent,
  photoSrc,
  dim,
  onWake,
  xstyle,
}: AmbientViewProps) {
  return (
    <button
      type="button"
      aria-label={copy.ambient.wake}
      onClick={onWake}
      {...stylex.props(ambientType, styles.root, xstyle)}
    >
      <PhotoBackdrop image={photoSrc && photoLayer(dim, photoSrc)} />
      <div {...stylex.props(styles.top)}>
        <span {...stylex.props(styles.label)}>
          <Icon icon={seasonIcons[season]} size={24} strokeWidth={1.5} />
          {copy.today.seasonMonth(copy.season[season], formatMonth(time))}
        </span>
        <div {...stylex.props(styles.topEnd)}>
          {offline && (
            <span {...stylex.props(styles.label, styles.offline)}>
              <Icon icon={WifiOff} size={20} />
              {copy.ambient.offline}
            </span>
          )}
          <span {...stylex.props(styles.label)}>{copy.appName}</span>
        </div>
      </div>
      <Clock time={time} hour12={clock === "12h"} />
      <div {...stylex.props(styles.bottom)}>
        <Zone
          state={weather}
          loading={<LineSkeleton label={copy.ambient.loadingWeather} />}
          empty={null}
          failed={null}
        >
          {([current]) => current && <AmbientWeather weather={current} now={time} unit={unit} />}
        </Zone>
        <div {...stylex.props(styles.event)}>
          <span {...stylex.props(styles.eyebrow)}>{copy.ambient.nextEvent}</span>
          <Zone
            state={nextEvent}
            loading={<LineSkeleton label={copy.ambient.loadingEvent} />}
            empty={<NextEvent>{copy.ambient.nothing}</NextEvent>}
            failed={null}
          >
            {([event]) => event && <NextEvent>{eventLine(event, time, clock)}</NextEvent>}
          </Zone>
        </div>
      </div>
      <span {...stylex.props(styles.caption)}>{copy.ambient.caption}</span>
    </button>
  );
}
