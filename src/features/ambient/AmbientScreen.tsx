"use client";

import { usePathname } from "next/navigation";
import { useNextEventAfter, useSignedOut, useWeather } from "@/data/repos";
import { ambientDim } from "@/domain/ambient";
import type { CalendarEvent } from "@/domain/schemas";
import { dateKey } from "@/domain/zone";
import { placeLabel } from "@/features/settings";
import { useBackgroundPhoto } from "@/shell/background";
import { useNetwork } from "@/shell/providers/network";
import { useNow } from "@/shell/providers/now";
import { useSeason } from "@/shell/providers/season";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { viewPath } from "@/shell/routes";
import { useSyncedZone, useWeatherZone } from "@/shell/sourceZone";
import { useAmbientNavigate, useAmbientRoot } from "@/shell/useAmbientNavigate";
import { usePageTransition } from "@/shell/usePageTransition";
import { AmbientView } from "./components/AmbientView";

const SIGN_IN = "/signin";

export function AmbientScreen() {
  const navigate = useAmbientNavigate();

  const pathname = usePathname();

  const wakeRef = usePageTransition<HTMLButtonElement>(pathname);

  useAmbientRoot(wakeRef, pathname);

  const settings = useAccountSettings();

  const season = useSeason();

  const time = useNow("second");

  const tz = useTimeZone();

  const { showOfflinePill } = useNetwork();

  const weather = useWeatherZone(useWeather(), settings.weatherLocation !== undefined);

  const nextEvent = useSyncedZone(eventRows(useNextEventAfter(dateKey(time, tz), tz)));

  const photo = useBackgroundPhoto();

  const signedOut = useSignedOut();

  return (
    <AmbientView
      season={season}
      time={time}
      clock={settings.clock}
      tz={tz}
      offline={showOfflinePill}
      signedOut={signedOut}
      place={settings.weatherLocation && placeLabel(settings.weatherLocation)}
      weather={weather.state}
      unit={settings.tempUnit}
      nextEvent={nextEvent.state}
      photoSrc={photo?.src}
      dim={ambientDim(settings.background.dim)}
      brightness={settings.ambientBrightness}
      onWake={() => navigate(signedOut ? SIGN_IN : viewPath("today"))}
      wakeRef={wakeRef}
    />
  );
}

function eventRows(event: CalendarEvent | null | undefined): CalendarEvent[] | undefined {
  if (event === undefined) return undefined;

  return event ? [event] : [];
}
