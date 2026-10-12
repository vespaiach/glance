"use client";

import { useRouter } from "next/navigation";
import { useNextEventAfter, usePhotoSrc, usePhotos, useWeather } from "@/data/repos";
import { ambientDim } from "@/domain/ambient";
import { shownBackground } from "@/domain/background";
import type { CalendarEvent } from "@/domain/schemas";
import { localDateKey } from "@/domain/time";
import { weatherZone } from "@/domain/weather";
import { readZoneState, type ZoneState } from "@/domain/zoneState";
import { useNetwork } from "@/shell/providers/network";
import { useNow } from "@/shell/providers/now";
import { useSeason } from "@/shell/providers/season";
import { useAccountSettings } from "@/shell/providers/settings";
import { viewPath } from "@/shell/routes";
import { AmbientView } from "./components/AmbientView";

function eventZone(event: CalendarEvent | null | undefined): ZoneState<CalendarEvent> {
  return readZoneState(event === undefined ? undefined : event ? [event] : []);
}

function useBackgroundSrc(): string | undefined {
  const { background } = useAccountSettings();

  const photoSrc = usePhotoSrc();

  const shown = shownBackground(background, usePhotos() ?? []);

  return shown.mode === "season" ? undefined : photoSrc(shown.photo.id, "display");
}

export function AmbientScreen() {
  const router = useRouter();

  const settings = useAccountSettings();

  const season = useSeason();

  const time = useNow("second");

  const { showOfflinePill } = useNetwork();

  const located = settings.weatherLocation !== undefined;

  const weather = weatherZone({ located, weather: useWeather(), failed: false });

  const nextEvent = eventZone(useNextEventAfter(localDateKey(time)));

  const photoSrc = useBackgroundSrc();

  return (
    <AmbientView
      season={season}
      time={time}
      clock={settings.clock}
      offline={showOfflinePill}
      weather={weather}
      unit={settings.tempUnit}
      nextEvent={nextEvent}
      photoSrc={photoSrc}
      dim={ambientDim(settings.background.dim)}
      onWake={() => router.push(viewPath("today"))}
    />
  );
}
