"use client";

import * as stylex from "@stylexjs/stylex";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  type ShownNote,
  useEventsOnDay,
  useNotes,
  usePhotoSrc,
  usePhotos,
  usePictureOfDay,
  useWeather,
} from "@/data/repos";
import type { AccountSettings, CalendarEvent, Photo } from "@/domain/schemas";
import { todayHero } from "@/domain/todayHero";
import { dateKey } from "@/domain/zone";
import type { ZoneState } from "@/domain/zoneState";
import { useBreakpoint, useViewportHeight, useViewportWidth } from "@/shell/breakpoint";
import { useNow } from "@/shell/providers/now";
import { useSeason } from "@/shell/providers/season";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { type View, viewPath } from "@/shell/routes";
import { useSheetHost } from "@/shell/SheetHost";
import { useSyncedZone, useWeatherZone } from "@/shell/sourceZone";
import { space } from "@/theme/tokens.stylex";
import { Zone } from "@/ui/Zone";
import { HeroSkeleton, HeroSummary } from "./components/HeroSummary";
import { PictureOfDay, PictureOfDayEmpty, PictureOfDaySkeleton } from "./components/PictureOfDay";
import { TodayHero } from "./components/TodayHero";
import { TodayNotes } from "./components/TodayNotes";
import { TodaySchedule } from "./components/TodaySchedule";
import { TodayWeather } from "./components/TodayWeather";
import { todayAreas, todayCapacity, todayLayout, todayScheduleFit } from "./layout";

const styles = stylex.create({
  grid: {
    display: "grid",
    gap: space.lg,
  },
});

type HeroProps = {
  state: ZoneState<CalendarEvent>;
  clock: AccountSettings["clock"];
  now: Date;
  tz: string;
  onOpenEvent: (id: string) => void;
};

function HeroClock({ children }: { children: ReactNode }) {
  const season = useSeason();

  const settings = useAccountSettings();

  const time = useNow("second");

  const tz = useTimeZone();

  return (
    <TodayHero season={season} time={time} clock={settings.clock} tz={tz} xstyle={todayAreas.hero}>
      {children}
    </TodayHero>
  );
}

type PictureProps = {
  state: ZoneState<Photo>;
  day: string;
  tz: string;
  canUpload: boolean;
  onUpload: () => void;
};

function Picture({ state, day, tz, canUpload, onUpload }: PictureProps) {
  const photoSrc = usePhotoSrc();

  const pick = usePictureOfDay(day, tz);

  const empty = <PictureOfDayEmpty canUpload={canUpload} onUpload={onUpload} />;

  return (
    <Zone state={state} loading={<PictureOfDaySkeleton />} empty={empty} failed={null}>
      {() => {
        if (pick === undefined) return <PictureOfDaySkeleton />;

        if (pick === null) return empty;

        return (
          <PictureOfDay
            photo={pick.photo}
            onThisDay={pick.onThisDay}
            thisYear={Number(day.slice(0, 4))}
            src={photoSrc(pick.photo.id, "display")}
          />
        );
      }}
    </Zone>
  );
}

function allDayCount(state: ZoneState<CalendarEvent>): number {
  return state.kind === "ready" ? state.data.filter((event) => event.allDay).length : 0;
}

function useScheduleCapacity(state: ZoneState<CalendarEvent>): number {
  const bp = useBreakpoint();

  const windowHeight = useViewportHeight();

  const portrait = useViewportWidth() <= windowHeight;

  return todayCapacity({ bp, portrait, windowHeight, allDayCount: allDayCount(state) });
}

function Hero({ state, clock, now, tz, onOpenEvent }: HeroProps) {
  if (state.kind === "loading") return <HeroSkeleton />;

  if (state.kind === "failed") return null;

  return (
    <HeroSummary
      hero={todayHero(state.kind === "ready" ? state.data : [], now, tz)}
      clock={clock}
      tz={tz}
      onOpenEvent={onOpenEvent}
    />
  );
}

export function TodayScreen() {
  const router = useRouter();

  const sheets = useSheetHost();

  const breakpoint = useBreakpoint();

  const settings = useAccountSettings();

  const now = useNow("minute");

  const tz = useTimeZone();

  const day = dateKey(now, tz);

  const events = useSyncedZone(useEventsOnDay(day, tz));

  const notes = useSyncedZone<ShownNote>(useNotes(now));

  const photos = useSyncedZone(usePhotos());

  const capacity = useScheduleCapacity(events.state);

  const weather = useWeatherZone(useWeather(), settings.weatherLocation !== undefined);

  const go = (view: View) => router.push(viewPath(view));

  const openEvent = (id: string) => sheets.open({ kind: "event", id });

  return (
    <div {...stylex.props(styles.grid, todayLayout(breakpoint))}>
      <HeroClock>
        <Hero
          state={events.state}
          clock={settings.clock}
          now={now}
          tz={tz}
          onOpenEvent={openEvent}
        />
      </HeroClock>
      <TodaySchedule
        state={events.state}
        retryIn={events.retryIn}
        onRetry={events.retry}
        now={now}
        clock={settings.clock}
        tz={tz}
        compact={breakpoint === "phone"}
        capacity={capacity}
        onOpenEvent={openEvent}
        onAddEvent={() => sheets.open({ kind: "newevent", day })}
        onOpenCalendar={() => go("calendar")}
        xstyle={[todayAreas.sched, todayScheduleFit(breakpoint)]}
      >
        {settings.background.mode === "season" && (
          <Picture
            state={photos.state}
            day={day}
            tz={tz}
            canUpload={breakpoint !== "phone"}
            onUpload={() => go("photos")}
          />
        )}
      </TodaySchedule>
      <TodayWeather
        state={weather.state}
        retryIn={weather.retryIn}
        onRetry={weather.retry}
        unit={settings.tempUnit}
        clock={settings.clock}
        tz={tz}
        onSetLocation={() => go("weather")}
        xstyle={todayAreas.wx}
      />
      <TodayNotes
        state={notes.state}
        retryIn={notes.retryIn}
        onRetry={notes.retry}
        now={now}
        clock={settings.clock}
        tz={tz}
        onOpenNote={(id) => sheets.open({ kind: "note", id })}
        onAddNote={() => sheets.open({ kind: "newnote" })}
        onOpenNotes={() => go("notes")}
        xstyle={todayAreas.notes}
      />
    </div>
  );
}
