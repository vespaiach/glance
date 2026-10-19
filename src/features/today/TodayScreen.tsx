"use client";

import * as stylex from "@stylexjs/stylex";
import { useRouter } from "next/navigation";
import { type ReactNode, useRef } from "react";
import {
  type ShownNote,
  useEventsOnDay,
  useMembers,
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
import { todayAreas, todayColumnsType, todayGrids, todayLayout, todayStackedType } from "./layout";
import { useScheduleRows } from "./useScheduleRows";

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

type HeroClockProps = {
  children: ReactNode;
  picture: ReactNode;
  xstyle: stylex.StyleXStyles;
};

type PictureProps = {
  state: ZoneState<Photo>;
  day: string;
  tz: string;
  showPhoto: boolean;
  canUpload: boolean;
  onOpen: (id: string) => void;
  onUpload: () => void;
};

export function TodayScreen() {
  const router = useRouter();

  const sheets = useSheetHost();

  const breakpoint = useBreakpoint();

  const layout = todayLayout(useViewportWidth(), useViewportHeight());

  const columns = layout.grid !== "stacked";

  const settings = useAccountSettings();

  const now = useNow("minute");

  const tz = useTimeZone();

  const day = dateKey(now, tz);

  const events = useSyncedZone(useEventsOnDay(day, tz));

  const members = useMembers();

  const notes = useSyncedZone<ShownNote>(useNotes(now));

  const photos = useSyncedZone(usePhotos());

  const scheduleRef = useRef<HTMLElement>(null);

  const rows = useScheduleRows(scheduleRef, !columns);

  const weather = useWeatherZone(useWeather(), settings.weatherLocation !== undefined);

  const go = (view: View) => router.push(viewPath(view));

  const openEvent = (id: string) => sheets.open({ kind: "event", id });

  return (
    <div
      {...stylex.props(
        columns ? todayColumnsType : todayStackedType,
        styles.grid,
        todayGrids[layout.grid],
      )}
    >
      <HeroClock
        xstyle={columns && [todayAreas.container, todayAreas.clipped]}
        picture={
          <Picture
            state={photos.state}
            day={day}
            tz={tz}
            showPhoto={settings.background.mode === "season"}
            canUpload={breakpoint !== "phone"}
            onOpen={(id) => router.push(`${viewPath("photos")}?photo=${id}`)}
            onUpload={() => go("photos")}
          />
        }
      >
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
        members={members ?? []}
        retryIn={events.retryIn}
        onRetry={events.retry}
        now={now}
        clock={settings.clock}
        tz={tz}
        compact={breakpoint === "phone"}
        iconActions={breakpoint !== "wide"}
        rows={rows}
        onOpenEvent={openEvent}
        onAddEvent={() => sheets.open({ kind: "newevent", day })}
        onOpenCalendar={() => go("calendar")}
        xstyle={[todayAreas.sched, columns && todayAreas.clipped]}
        ref={scheduleRef}
      />
      <TodayWeather
        state={weather.state}
        retryIn={weather.retryIn}
        onRetry={weather.retry}
        unit={settings.tempUnit}
        clock={settings.clock}
        tz={tz}
        onSetLocation={() => go("weather")}
        xstyle={[todayAreas.wx, columns && todayAreas.container]}
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
        columns={layout.noteColumns}
        xstyle={[todayAreas.notes, columns && todayAreas.clipped]}
      />
    </div>
  );
}

function HeroClock({ children, picture, xstyle }: HeroClockProps) {
  const season = useSeason();

  const settings = useAccountSettings();

  const time = useNow("second");

  const tz = useTimeZone();

  return (
    <TodayHero
      season={season}
      time={time}
      clock={settings.clock}
      tz={tz}
      picture={picture}
      xstyle={[todayAreas.hero, xstyle]}
    >
      {children}
    </TodayHero>
  );
}

function Picture({ state, day, tz, showPhoto, canUpload, onOpen, onUpload }: PictureProps) {
  const photoSrc = usePhotoSrc();

  const pick = usePictureOfDay(day, tz);

  const empty = canUpload ? <PictureOfDayEmpty onUpload={onUpload} /> : null;

  const loading = showPhoto ? <PictureOfDaySkeleton /> : null;

  return (
    <Zone state={state} loading={loading} empty={empty} failed={null}>
      {() => {
        if (pick === undefined) return loading;

        if (pick === null) return empty;

        if (!showPhoto) return null;

        return (
          <PictureOfDay
            photo={pick.photo}
            onThisDay={pick.onThisDay}
            src={photoSrc(pick.photo.id, "thumb")}
            onOpen={() => onOpen(pick.photo.id)}
          />
        );
      }}
    </Zone>
  );
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
