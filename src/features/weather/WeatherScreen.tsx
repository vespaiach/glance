"use client";

import { copy } from "@/copy";
import { fixtureWeatherSearch, useSyncStatus, useWeather } from "@/data/repos";
import type { WeatherLocation } from "@/domain/schemas";
import { retryMinutes, weatherZone } from "@/domain/weather";
import { useBreakpoint } from "@/shell/breakpoint";
import { useFixtureParams } from "@/shell/fixtureOptions";
import { useNetwork } from "@/shell/providers/network";
import { useNow } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { Zone } from "@/ui/Zone";
import { WeatherFailure } from "./components/WeatherFailure";
import { WeatherForecast } from "./components/WeatherForecast";
import { WeatherSetup } from "./components/WeatherSetup";
import { WeatherSkeleton } from "./components/WeatherSkeleton";
import { initialWeatherSetup } from "./weatherSetup";

const retryLater = () => {};

function placeName(location: WeatherLocation | undefined): string {
  return location ? copy.weather.place(location.name, location.region) : "";
}

export function WeatherScreen() {
  const breakpoint = useBreakpoint();

  const settings = useAccountSettings();

  const now = useNow("minute");

  const { online } = useNetwork();

  const fixture = useFixtureParams();

  const weather = useWeather();

  const status = useSyncStatus()?.weather;

  const failedStatus = status?.state === "failed" ? status : undefined;

  const location = settings.weatherLocation;

  const state = weatherZone({
    located: location !== undefined,
    weather,
    failed: failedStatus !== undefined,
  });

  return (
    <Zone
      state={state}
      loading={<WeatherSkeleton breakpoint={breakpoint} />}
      empty={<WeatherSetup initial={initialWeatherSetup(fixture.wx, fixtureWeatherSearch)} />}
      failed={
        <WeatherFailure
          location={placeName(location)}
          minutes={failedStatus ? retryMinutes(failedStatus.retryAt, now) : 1}
          onRetry={retryLater}
        />
      }
    >
      {([forecast]) =>
        forecast && (
          <WeatherForecast
            weather={forecast}
            unit={settings.tempUnit}
            clock={settings.clock}
            today={now}
            offline={!online}
            breakpoint={breakpoint}
          />
        )
      }
    </Zone>
  );
}
