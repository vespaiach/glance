"use client";

import { copy } from "@/copy";
import {
  fixtureWeatherSearch,
  type SettingsRepo,
  useSettingsRepo,
  useWeather,
  useWeatherRepo,
} from "@/data/repos";
import { forecastStale } from "@/domain/offline";
import type { WeatherLocation } from "@/domain/schemas";
import { useBreakpoint } from "@/shell/breakpoint";
import { useFixtureParams } from "@/shell/fixtureOptions";
import { useNetwork } from "@/shell/providers/network";
import { useNow } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { useWeatherZone } from "@/shell/sourceZone";
import { Zone } from "@/ui/Zone";
import { WeatherFailure } from "./components/WeatherFailure";
import { WeatherForecast } from "./components/WeatherForecast";
import { WeatherSetup } from "./components/WeatherSetup";
import { WeatherSkeleton } from "./components/WeatherSkeleton";
import { useWeatherSetup } from "./useWeatherSetup";
import { initialWeatherSetup } from "./weatherSetup";

function placeName(location: WeatherLocation | undefined): string {
  return location ? copy.weather.place(location.name, location.region) : "";
}

function saveLocation(settings: SettingsRepo) {
  return (place: WeatherLocation) =>
    settings.update({ weatherLocation: place }).then(
      () => true,
      () => false,
    );
}

export function WeatherScreen() {
  const breakpoint = useBreakpoint();

  const settings = useAccountSettings();

  const now = useNow("minute");

  const { online } = useNetwork();

  const fixture = useFixtureParams();

  const setup = useWeatherSetup({
    initial: () => initialWeatherSetup(fixture.wx, fixtureWeatherSearch),
    source: useWeatherRepo(),
    save: saveLocation(useSettingsRepo()),
  });

  const location = settings.weatherLocation;

  const tz = useTimeZone();

  const zone = useWeatherZone(useWeather(), location !== undefined);

  return (
    <Zone
      state={zone.state}
      loading={<WeatherSkeleton breakpoint={breakpoint} />}
      empty={
        <WeatherSetup
          state={setup.state}
          canLocate={setup.canLocate}
          onType={setup.type}
          onSubmit={setup.submit}
          onPick={setup.pick}
          onLocate={setup.locate}
        />
      }
      failed={
        <WeatherFailure
          location={placeName(location)}
          minutes={zone.retryIn}
          onRetry={zone.retry}
        />
      }
    >
      {([forecast], updatedAt) =>
        forecast && (
          <WeatherForecast
            weather={forecast}
            {...(updatedAt !== undefined && { updatedAt })}
            unit={settings.tempUnit}
            clock={settings.clock}
            tz={tz}
            today={now}
            stale={!online && forecastStale(forecast.fetchedAt, now)}
            breakpoint={breakpoint}
          />
        )
      }
    </Zone>
  );
}
