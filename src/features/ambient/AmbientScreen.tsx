"use client";

import { usePathname } from "next/navigation";
import { copy } from "@/copy";
import {
  useEventsBetween,
  useNextEventAfter,
  useSignedOut,
  useTags,
  useWeather,
} from "@/data/repos";
import { ambientDim } from "@/domain/ambient";
import { ambientReminder } from "@/domain/reminders";
import type { CalendarEvent } from "@/domain/schemas";
import { whoLabel } from "@/domain/tags";
import type { Clock } from "@/domain/time";
import { addDays, dateKey } from "@/domain/zone";
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
import { type NextEventLines, reminderLines } from "./nextEvent";

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

  const today = dateKey(time, tz);

  const nextEvent = useSyncedZone(eventRows(useNextEventAfter(today, tz)));

  const reminder = useReminderLines(today, time, settings.clock, tz);

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
      reminder={reminder}
      photoSrc={photo?.src}
      dim={ambientDim(settings.background.dim)}
      brightness={settings.ambientBrightness}
      onWake={() => navigate(signedOut ? SIGN_IN : viewPath("today"))}
      wakeRef={wakeRef}
    />
  );
}

function useReminderLines(
  today: string,
  time: Date,
  clock: Clock,
  tz: string,
): NextEventLines | undefined {
  const events = useEventsBetween(today, addDays(today, 2), tz);

  const tags = useTags() ?? [];

  const reminder = events && ambientReminder(events, time, tz);

  if (reminder === undefined) return undefined;

  return reminderLines(
    reminder,
    whoLabel(reminder.event, tags, copy.events.everyone),
    time,
    clock,
    tz,
  );
}

function eventRows(event: CalendarEvent | null | undefined): CalendarEvent[] | undefined {
  if (event === undefined) return undefined;

  return event ? [event] : [];
}
