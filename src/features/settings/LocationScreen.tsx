"use client";

import { useRouter } from "next/navigation";
import {
  fixtureWeatherSearch,
  type SettingsRepo,
  useSettingsRepo,
  useUpcomingEvent,
  useWeatherRepo,
} from "@/data/repos";
import type { WeatherLocation } from "@/domain/schemas";
import { asksZoneChange } from "@/domain/zoneName";
import { initialWeatherSetup, useWeatherSetup } from "@/features/weather";
import { useBreakpoint } from "@/shell/breakpoint";
import { useFixtureParams } from "@/shell/fixtureOptions";
import { useNow } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { LocationView } from "./components/LocationView";

const SETTINGS_PATH = "/settings";

export function LocationScreen() {
  const router = useRouter();

  const breakpoint = useBreakpoint();

  const settings = useAccountSettings();

  const now = useNow("minute");

  const fixture = useFixtureParams();

  const saved = settings.weatherLocation;

  const setup = useWeatherSetup({
    initial: () => initialWeatherSetup(fixture.wx, fixtureWeatherSearch, { confirmsZone: true }),
    source: useWeatherRepo(),
    save: saveThen(useSettingsRepo(), () => router.replace(SETTINGS_PATH)),
    asksZone: (place) => asksZoneChange(saved?.timeZone, place.timeZone),
  });

  const upcoming = useUpcomingEvent(now);

  return (
    <LocationView
      location={saved}
      now={now}
      clock={settings.clock}
      setup={setup}
      example={upcoming ?? undefined}
      breakpoint={breakpoint}
      onBack={() => router.push(SETTINGS_PATH)}
    />
  );
}

function saveThen(settings: SettingsRepo, done: () => void) {
  return (place: WeatherLocation) =>
    settings.update({ weatherLocation: place }).then(
      () => {
        done();

        return true;
      },
      () => false,
    );
}
