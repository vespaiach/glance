"use client";

import * as stylex from "@stylexjs/stylex";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useEffectEvent, useRef } from "react";
import {
  type ShownNote,
  useEventsAfter,
  useEventsOnDay,
  useNotes,
  usePhotoSrc,
  usePhotos,
  useTags,
  useTodaysPhoto,
  useWeather,
} from "@/data/repos";
import { shownBackground } from "@/domain/background";
import type { Breakpoint } from "@/domain/breakpoint";
import { dayRibbon } from "@/domain/dayRibbon";
import { slotTimes } from "@/domain/eventTimes";
import type { AccountSettings, CalendarEvent, Photo, Tag, Weather } from "@/domain/schemas";
import { filterTagIds, liveFilter } from "@/domain/tags";
import { hasEvent, todayHero } from "@/domain/todayHero";
import { comingUp } from "@/domain/todaySchedule";
import type { TodaysPhotoPick } from "@/domain/todaysPhoto";
import { hourlyByHour } from "@/domain/weather";
import { dateKey } from "@/domain/zone";
import type { ZoneState } from "@/domain/zoneState";
import { newestFirst, usePhotoPicker, useUploads } from "@/features/photos";
import { useQrTile } from "@/features/settings";
import { useBreakpoint, useViewportWidth } from "@/shell/breakpoint";
import { useOnIdle } from "@/shell/providers/idle";
import { useNetwork } from "@/shell/providers/network";
import { useNow } from "@/shell/providers/now";
import { useSeason } from "@/shell/providers/season";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { useWhoFilter } from "@/shell/providers/whoFilter";
import { type View, viewPath } from "@/shell/routes";
import { useSheetHost } from "@/shell/SheetHost";
import { useSyncedZone, useWeatherZone } from "@/shell/sourceZone";
import { sizes, space } from "@/theme/tokens.stylex";
import type { TimelineWeather } from "@/ui/DayTimeline";
import { HeroSkeleton, HeroSummary } from "./components/HeroSummary";
import { NowWeather } from "./components/NowWeather";
import { OpenDay } from "./components/OpenDay";
import { TodayHero } from "./components/TodayHero";
import { TodayNotes } from "./components/TodayNotes";
import { TodaySchedule } from "./components/TodaySchedule";
import { type ShownPhoto, TodaysPhoto } from "./components/TodaysPhoto";
import { todayAreas, todayGrids, todayLayout, todayPhotoFrames, todayType } from "./layout";
import { firstUpload, momentsLine, photoText } from "./todaysPhoto";

const TEXT_ACTIONS_MIN_WIDTH = 1440;

const COMING_UP_READ = 5;

const NO_TAGS: Tag[] = [];

const NO_PHOTOS: Photo[] = [];

const styles = stylex.create({
  grid: {
    display: "grid",
    gap: space.lg,
    marginBottom: `calc(${sizes.kioskGutter} - ${space.md})`,
  },
});

type HeroProps = {
  state: ZoneState<CalendarEvent>;
  sunset: Date | undefined;
  tags: readonly Tag[];
  clock: AccountSettings["clock"];
  now: Date;
  tz: string;
  onOpenEvent: (id: string) => void;
};

type NowPanelProps = {
  breakpoint: Breakpoint;
  weather: ReactNode;
  children: ReactNode;
  xstyle: stylex.StyleXStyles;
};

type PictureProps = {
  state: ZoneState<Photo>;
  day: string;
  tz: string;
  large: boolean;
  onOpen: (id: string) => void;
  onOpenPhotos: () => void;
};

type PickInput = {
  state: ZoneState<Photo>;
  pick: TodaysPhotoPick | null | undefined;
  thisYear: number;
  photoSrc: ReturnType<typeof usePhotoSrc>;
};

export function TodayScreen() {
  const router = useRouter();

  const sheets = useSheetHost();

  const breakpoint = useBreakpoint();

  const width = useViewportWidth();

  const grid = todayLayout(breakpoint);

  const columns = grid !== "stacked";

  const settings = useAccountSettings();

  const now = useNow("minute");

  const tz = useTimeZone();

  const day = dateKey(now, tz);

  const events = useSyncedZone(useEventsOnDay(day, tz));

  const later = useEventsAfter(day, tz, COMING_UP_READ);

  const tags = useTags() ?? NO_TAGS;

  const who = useWhoFilter();

  const allIds = tags.map((tag) => tag.id);

  const selected = liveFilter(who.filter, allIds);

  const people = filterTagIds(selected, allIds);

  const notes = useSyncedZone<ShownNote>(useNotes(now));

  const photos = useSyncedZone(usePhotos());

  const weather = useWeatherZone(useWeather(), settings.weatherLocation !== undefined);

  const go = (view: View) => router.push(viewPath(view));

  const openEvent = (id: string) => sheets.open({ kind: "event", id });

  return (
    <div {...stylex.props(todayType, styles.grid, todayGrids[grid])}>
      <NowPanel
        breakpoint={breakpoint}
        xstyle={todayAreas.hero}
        weather={
          <NowWeather
            state={weather.state}
            retryIn={weather.retryIn}
            unit={settings.tempUnit}
            clock={settings.clock}
            tz={tz}
            small={breakpoint === "small"}
            onOpenWeather={() => go("weather")}
            onSetLocation={() => go("weather")}
          />
        }
      >
        <Hero
          state={events.state}
          sunset={sunsetOf(weather.state)}
          tags={tags}
          clock={settings.clock}
          now={now}
          tz={tz}
          onOpenEvent={openEvent}
        />
      </NowPanel>
      <TodaySchedule
        state={events.state}
        tags={tags}
        selected={selected}
        onFilter={who.setFilter}
        retryIn={events.retryIn}
        onRetry={events.retry}
        day={day}
        now={now}
        clock={settings.clock}
        tz={tz}
        breakpoint={breakpoint}
        iconActions={width < TEXT_ACTIONS_MIN_WIDTH}
        weather={gutterWeather(weather.state, day, tz, settings.tempUnit)}
        upcoming={later && comingUp(later, now, tz)}
        onOpenEvent={openEvent}
        onAddEvent={() => sheets.open({ kind: "newevent", day, who: people })}
        onAddSlot={(slot) =>
          sheets.open({ kind: "newevent", day, who: people, times: slotTimes(slot, tz) })
        }
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
        breakpoint={breakpoint}
        xstyle={[todayAreas.notes, columns && todayAreas.clipped]}
      />
      <Picture
        state={photos.state}
        day={day}
        tz={tz}
        large={grid === "threeColumn"}
        onOpen={(id) => router.push(`${viewPath("photos")}?photo=${id}`)}
        onOpenPhotos={() => go("photos")}
      />
    </div>
  );
}

function NowPanel({ breakpoint, weather, children, xstyle }: NowPanelProps) {
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
      breakpoint={breakpoint}
      weather={weather}
      xstyle={xstyle}
    >
      {children}
    </TodayHero>
  );
}

function Picture({ state, day, tz, large, onOpen, onOpenPhotos }: PictureProps) {
  const photoSrc = usePhotoSrc();

  const { background } = useAccountSettings();

  const { online } = useNetwork();

  const now = useNow("minute");

  const photos = state.kind === "ready" ? state.data : NO_PHOTOS;

  const pick = useTodaysPhoto(day, tz, backgroundId(background, photos, now, tz));

  const uploads = useUploads(online);

  const picker = usePhotoPicker(uploads.choose);

  const qr = useQrTile("photos");

  useOnIdle(qr.close);

  useOnPhotoArrival(photos.length, qr.close);

  const thisYear = Number(day.slice(0, 4));

  const chooseFiles = () => {
    qr.close();

    picker.open();
  };

  return (
    <>
      {picker.input}
      <TodaysPhoto
        state={shownPhoto({ state, pick, thisYear, photoSrc })}
        upload={firstUpload(uploads.tiles)}
        qr={large && qr.tile.kind !== "closed" ? { url: qrUrl(qr.tile) } : undefined}
        online={online}
        fromPhone={large}
        moments={momentsLine(day)}
        frame={large && todayPhotoFrames.capped}
        onAdd={large ? qr.show : picker.open}
        onChooseFiles={chooseFiles}
        onCloseQr={qr.close}
        onOpen={onOpen}
        onOpenPhotos={onOpenPhotos}
        xstyle={todayAreas.potd}
      />
    </>
  );
}

function Hero({ state, sunset, tags, clock, now, tz, onOpenEvent }: HeroProps) {
  if (state.kind === "loading") return <HeroSkeleton />;

  if (state.kind === "failed") return null;

  const events = state.kind === "ready" ? state.data : [];

  const hero = todayHero(events, now, tz);

  if (hasEvent(hero)) {
    return <HeroSummary hero={hero} tags={tags} clock={clock} tz={tz} onOpenEvent={onOpenEvent} />;
  }

  return (
    <OpenDay
      hero={hero}
      ribbon={dayRibbon(events, now, sunset, tz)}
      now={now}
      clock={clock}
      tz={tz}
    />
  );
}

function sunsetOf(state: ZoneState<Weather>): Date | undefined {
  return state.kind === "ready" && state.data[0]
    ? new Date(state.data[0].current.sunset)
    : undefined;
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

function backgroundId(
  background: AccountSettings["background"],
  photos: readonly Photo[],
  now: Date,
  tz: string,
): string | undefined {
  const shown = shownBackground(background, photos, now, tz);

  return shown.mode === "season" ? undefined : shown.photo.id;
}

function shownPhoto({ state, pick, thisYear, photoSrc }: PickInput): ZoneState<ShownPhoto> {
  if (state.kind !== "ready") return state;

  const chosen = pick;

  if (chosen === undefined) return { kind: "loading" };

  if (chosen === null) return { kind: "empty" };

  const { photo } = chosen;

  const others = newestFirst(state.data.filter((each) => each.id !== photo.id));

  const shown = {
    photo,
    src: photoSrc(photo.id, "display"),
    text: photoText(photo, chosen.onThisDay, thisYear),
    others: others.map((each) => ({ id: each.id, src: photoSrc(each.id, "thumb") })),
  };

  return { kind: "ready", data: [shown] };
}

function qrUrl(tile: ReturnType<typeof useQrTile>["tile"]): string | undefined {
  return tile.kind === "open" ? tile.url : undefined;
}

function useOnPhotoArrival(count: number, onArrival: () => void) {
  const seen = useRef(count);

  const arrived = useEffectEvent(onArrival);

  useEffect(() => {
    if (count > seen.current) arrived();

    seen.current = count;
  }, [count]);
}
