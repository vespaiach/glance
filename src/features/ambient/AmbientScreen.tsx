"use client";

import { useRouter } from "next/navigation";
import { useNextEventAfter, useWeather } from "@/data/repos";
import { ambientDim } from "@/domain/ambient";
import type { CalendarEvent } from "@/domain/schemas";
import { localDateKey } from "@/domain/time";
import { useBackgroundPhoto } from "@/shell/background";
import { useNetwork } from "@/shell/providers/network";
import { useNow } from "@/shell/providers/now";
import { useSeason } from "@/shell/providers/season";
import { useAccountSettings } from "@/shell/providers/settings";
import { viewPath } from "@/shell/routes";
import { useSyncedZone, useWeatherZone } from "@/shell/sourceZone";
import { AmbientView } from "./components/AmbientView";

function eventRows(event: CalendarEvent | null | undefined): CalendarEvent[] | undefined {
  if (event === undefined) return undefined;

  return event ? [event] : [];
}

export function AmbientScreen() {
  const router = useRouter();

  const settings = useAccountSettings();

  const season = useSeason();

  const time = useNow("second");

  const { showOfflinePill } = useNetwork();

  const weather = useWeatherZone(useWeather(), settings.weatherLocation !== undefined);

  const nextEvent = useSyncedZone(eventRows(useNextEventAfter(localDateKey(time))));

  const photo = useBackgroundPhoto();

  return (
    <AmbientView
      season={season}
      time={time}
      clock={settings.clock}
      offline={showOfflinePill}
      weather={weather.state}
      unit={settings.tempUnit}
      nextEvent={nextEvent.state}
      photoSrc={photo?.src}
      dim={ambientDim(settings.background.dim)}
      onWake={() => router.push(viewPath("today"))}
    />
  );
}
