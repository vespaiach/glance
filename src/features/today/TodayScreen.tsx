"use client";

import * as stylex from "@stylexjs/stylex";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
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
import { slotTimes } from "@/domain/eventTimes";
import type { AccountSettings, CalendarEvent, Member, Photo, Weather } from "@/domain/schemas";
import { todayHero } from "@/domain/todayHero";
import { hourlyByHour } from "@/domain/weather";
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
import type { TimelineWeather } from "@/ui/DayTimeline";
import { Zone } from "@/ui/Zone";
import { HeroSkeleton, HeroSummary } from "./components/HeroSummary";
import { NowWeather } from "./components/NowWeather";
import {
  PictureOfDay,
  PictureOfDayEmpty,
  PictureOfDayPanel,
  PictureOfDaySkeleton,
} from "./components/PictureOfDay";
import { TodayHero } from "./components/TodayHero";
import { TodayNotes } from "./components/TodayNotes";
import { TodaySchedule } from "./components/TodaySchedule";
import {
  type TodayGrid,
  todayAreas,
  todayGrids,
  todayLayout,
  todayPotdHeights,
  todayType,
} from "./layout";

const TEXT_ACTIONS_MIN_WIDTH = 1440;

const styles = stylex.create({
  grid: {
    display: "grid",
    gap: space.lg,
  },
});

type HeroProps = {
  state: ZoneState<CalendarEvent>;
  members: readonly Member[];
  clock: AccountSettings["clock"];
  now: Date;
  tz: string;
  onOpenEvent: (id: string) => void;
};

type NowPanelProps = {
  weather: ReactNode;
  children: ReactNode;
  xstyle: stylex.StyleXStyles;
};

type PictureProps = {
  state: ZoneState<Photo>;
  day: string;
  tz: string;
  grid: TodayGrid;
  canUpload: boolean;
  onOpen: (id: string) => void;
  onOpenPhotos: () => void;
};

export function TodayScreen() {
  const router = useRouter();

  const sheets = useSheetHost();

  const breakpoint = useBreakpoint();

  const width = useViewportWidth();

  const layout = todayLayout(width, useViewportHeight());

  const columns = layout.grid !== "stacked";

  const settings = useAccountSettings();

  const now = useNow("minute");

  const tz = useTimeZone();

  const day = dateKey(now, tz);

  const events = useSyncedZone(useEventsOnDay(day, tz));

  const members = useMembers() ?? [];

  const notes = useSyncedZone<ShownNote>(useNotes(now));

  const photos = useSyncedZone(usePhotos());

  const weather = useWeatherZone(useWeather(), settings.weatherLocation !== undefined);

  const go = (view: View) => router.push(viewPath(view));

  const openEvent = (id: string) => sheets.open({ kind: "event", id });

  return (
    <div {...stylex.props(todayType, styles.grid, todayGrids[layout.grid])}>
      <NowPanel
        xstyle={[todayAreas.hero, columns && todayAreas.clipped]}
        weather={
          <NowWeather
            state={weather.state}
            retryIn={weather.retryIn}
            unit={settings.tempUnit}
            clock={settings.clock}
            tz={tz}
            onOpenWeather={() => go("weather")}
            onSetLocation={() => go("weather")}
          />
        }
      >
        <Hero
          state={events.state}
          members={members}
          clock={settings.clock}
          now={now}
          tz={tz}
          onOpenEvent={openEvent}
        />
      </NowPanel>
      <TodaySchedule
        state={events.state}
        members={members}
        retryIn={events.retryIn}
        onRetry={events.retry}
        day={day}
        now={now}
        clock={settings.clock}
        tz={tz}
        breakpoint={breakpoint}
        oneColumn={!columns}
        iconActions={width < TEXT_ACTIONS_MIN_WIDTH}
        weather={gutterWeather(weather.state, day, tz, settings.tempUnit)}
        onOpenEvent={openEvent}
        onAddEvent={() => sheets.open({ kind: "newevent", day })}
        onAddSlot={(slot) => sheets.open({ kind: "newevent", day, times: slotTimes(slot, tz) })}
        onOpenCalendar={() => go("calendar")}
        xstyle={[todayAreas.sched, columns && todayAreas.clipped]}
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
        limit={layout.noteLimit}
        xstyle={[todayAreas.notes, columns && todayAreas.clipped]}
      />
      <Picture
        state={photos.state}
        day={day}
        tz={tz}
        grid={layout.grid}
        canUpload={breakpoint !== "phone"}
        onOpen={(id) => router.push(`${viewPath("photos")}?photo=${id}`)}
        onOpenPhotos={() => go("photos")}
      />
    </div>
  );
}

function NowPanel({ weather, children, xstyle }: NowPanelProps) {
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
      weather={weather}
      xstyle={xstyle}
    >
      {children}
    </TodayHero>
  );
}

function Picture({ state, day, tz, grid, canUpload, onOpen, onOpenPhotos }: PictureProps) {
  const photoSrc = usePhotoSrc();

  const pick = usePictureOfDay(day, tz);

  const height = grid === "threeColumn" ? todayPotdHeights.fill : todayPotdHeights.tall;

  const empty = canUpload ? <PictureOfDayEmpty onUpload={onOpenPhotos} xstyle={height} /> : null;

  const loading = <PictureOfDaySkeleton xstyle={height} />;

  return (
    <PictureOfDayPanel
      onThisDay={pick?.onThisDay}
      onOpenPhotos={onOpenPhotos}
      xstyle={todayAreas.potd}
    >
      <Zone state={state} loading={loading} empty={empty} failed={null}>
        {() => {
          if (pick === undefined) return loading;

          if (pick === null) return empty;

          return (
            <PictureOfDay
              photo={pick.photo}
              src={photoSrc(pick.photo.id, "display")}
              onOpen={() => onOpen(pick.photo.id)}
              xstyle={height}
            />
          );
        }}
      </Zone>
    </PictureOfDayPanel>
  );
}

function Hero({ state, members, clock, now, tz, onOpenEvent }: HeroProps) {
  if (state.kind === "loading") return <HeroSkeleton />;

  if (state.kind === "failed") return null;

  return (
    <HeroSummary
      hero={todayHero(state.kind === "ready" ? state.data : [], now, tz)}
      members={members}
      clock={clock}
      tz={tz}
      onOpenEvent={onOpenEvent}
    />
  );
}

function gutterWeather(
  state: ZoneState<Weather>,
  day: string,
  tz: string,
  unit: AccountSettings["tempUnit"],
): TimelineWeather | undefined {
  const forecast = state.kind === "ready" ? state.data[0] : undefined;

  if (!forecast || hourlyByHour(forecast.hourly, day, tz).size === 0) return undefined;

  return { hourly: forecast.hourly, unit };
}
