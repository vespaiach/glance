"use client";

import { copy } from "@/copy";
import { fixtureWeatherSearch, useWeather } from "@/data/repos";
import type { WeatherLocation } from "@/domain/schemas";
import { useBreakpoint } from "@/shell/breakpoint";
import { useFixtureParams } from "@/shell/fixtureOptions";
import { useNetwork } from "@/shell/providers/network";
import { useNow } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
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

export function WeatherScreen() {
  const breakpoint = useBreakpoint();

  const settings = useAccountSettings();

  const now = useNow("minute");

  const { online } = useNetwork();

  const fixture = useFixtureParams();

  const setup = useWeatherSetup(() => initialWeatherSetup(fixture.wx, fixtureWeatherSearch));

  const location = settings.weatherLocation;

  const zone = useWeatherZone(useWeather(), location !== undefined);

  return (
    <Zone
      state={zone.state}
      loading={<WeatherSkeleton breakpoint={breakpoint} />}
      empty={
        <WeatherSetup
          state={setup.state}
          onType={setup.type}
          onSubmit={setup.submit}
          onPick={setup.pick}
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
            today={now}
            offline={!online}
            breakpoint={breakpoint}
          />
        )
      }
    </Zone>
  );
}
