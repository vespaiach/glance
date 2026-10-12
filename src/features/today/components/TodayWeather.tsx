import * as stylex from "@stylexjs/stylex";
import { ArrowRight, CloudOff, CloudSun } from "lucide-react";
import type { ReactNode } from "react";
import { copy } from "@/copy";
import type { AccountSettings, Weather } from "@/domain/schemas";
import { displayTemp } from "@/domain/temperature";
import type { WmoCondition } from "@/domain/wmo";
import type { ZoneState } from "@/domain/zoneState";
import { radii, space } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { ColorBlock } from "@/ui/ColorBlock";
import { EmptyState } from "@/ui/EmptyState";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";
import { WeatherNow } from "@/ui/WeatherNow";
import { Zone } from "@/ui/Zone";

type TodayWeatherProps = {
  state: ZoneState<Weather>;
  unit: AccountSettings["tempUnit"];
  onSetLocation: () => void;
  xstyle?: stylex.StyleXStyles;
};

const PADDING = "clamp(24px, 2.4vw, 32px)";

const styles = stylex.create({
  block: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },
  now: {
    padding: PADDING,
    minWidth: 0,
  },
  message: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  skeleton: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  reading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.md,
  },
});

function conditionText(condition: string): string {
  return Object.hasOwn(copy.weather.condition, condition)
    ? copy.weather.condition[condition as WmoCondition]
    : condition;
}

function WeatherBlock({ children, xstyle }: { children: ReactNode; xstyle?: stylex.StyleXStyles }) {
  return (
    <ColorBlock tone={3} padding={PADDING} xstyle={[styles.block, xstyle]}>
      {children}
    </ColorBlock>
  );
}

function WeatherSkeleton({ xstyle }: { xstyle?: stylex.StyleXStyles }) {
  return (
    <WeatherBlock xstyle={xstyle}>
      <Skeleton label={copy.today.weather.loading} xstyle={styles.skeleton}>
        <SkeletonBlock width={120} height={14} />
        <div {...stylex.props(styles.reading)}>
          <SkeletonBlock width={150} height={84} radius="12px" />
          <SkeletonBlock width={72} height={72} radius={radii.full} />
        </div>
        <SkeletonBlock width="60%" height={18} />
      </Skeleton>
    </WeatherBlock>
  );
}

export function TodayWeather({ state, unit, onSetLocation, xstyle }: TodayWeatherProps) {
  const temp = (fahrenheit: number) => displayTemp(fahrenheit, unit);

  return (
    <Zone
      state={state}
      loading={<WeatherSkeleton xstyle={xstyle} />}
      empty={
        <WeatherBlock xstyle={xstyle}>
          <EmptyState
            icon={CloudSun}
            title={copy.today.weather.needsTitle}
            body={copy.today.weather.needsBody}
            action={
              <Button variant="secondary" iconRight={ArrowRight} onClick={onSetLocation}>
                {copy.today.weather.setLocation}
              </Button>
            }
            xstyle={styles.message}
          />
        </WeatherBlock>
      }
      failed={
        <WeatherBlock xstyle={xstyle}>
          <EmptyState icon={CloudOff} title={copy.today.unavailable.weather} />
        </WeatherBlock>
      }
    >
      {([weather]) =>
        weather && (
          <WeatherNow
            location={weather.location}
            temp={temp(weather.current.temp)}
            condition={conditionText(weather.current.condition)}
            icon={weather.current.icon}
            high={temp(weather.current.high)}
            low={temp(weather.current.low)}
            feelsLike={temp(weather.current.feelsLike)}
            labels={copy.weather.range}
            xstyle={[styles.now, xstyle]}
          />
        )
      }
    </Zone>
  );
}
