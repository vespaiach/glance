import * as stylex from "@stylexjs/stylex";
import { dayRibbon } from "@/domain/dayRibbon";
import type { CalendarEvent, Season } from "@/domain/schemas";
import { type EventHero, hasEvent, todayHero } from "@/domain/todayHero";
import {
  HeroSkeleton,
  HeroSummary,
  NowWeather,
  OpenDay,
  PictureOfDay,
  PictureOfDayEmpty,
  PictureOfDayPanel,
  PictureOfDaySkeleton,
  TodayHero,
  TodayNotes,
  TodaySchedule,
} from "@/features/today";
import { GalleryGroup } from "./GalleryGroup";
import {
  ALL_DAY_EVENTS,
  BOARD_NOTES,
  COMING_UP_EVENTS,
  FULL_WEATHER,
  GALLERY_FAMILY,
  GALLERY_TZ,
  gallery,
  NOW,
  octoberAt,
  TODAY_EVENTS,
  TODAY_MANY,
  TODAY_NOTES,
  TODAY_PHOTO,
  TODAY_PHOTO_SRC,
  TODAY_WEATHER,
  TODAY_WITH_ALL_DAY,
} from "./samples";
import { hourlyOn } from "./timelineSamples";

const ignore = () => {};

const UPDATED_AT = octoberAt(9, 9, 32).toISOString();

const failure = { retryIn: 1, onRetry: ignore } as const;

const LATER = octoberAt(9, 9, 45);

const EVENING = octoberAt(9, 19, 0);

const NOW_HERO = eventHero(NOW);

const NEXT_HERO = eventHero(LATER);

const SUNSET = TODAY_WEATHER.current.sunset;

const WRAPPED = { kind: "ended", done: TODAY_EVENTS.length } as const;

const WIDE = { kind: "none" } as const;

const OPEN_DAYS = [
  { key: "wrap", hero: WRAPPED, now: EVENING, events: TODAY_EVENTS },
  { key: "wide", hero: WIDE, now: NOW, events: [] },
  { key: "morning", hero: WIDE, now: octoberAt(9, 6, 0), events: [] },
  { key: "after-sunset", hero: WIDE, now: octoberAt(9, 20, 30), events: [] },
] as const;

const PICTURES = [
  {
    key: "photo",
    picture: (
      <PictureOfDayPanel onOpenPhotos={ignore}>
        <PictureOfDay photo={TODAY_PHOTO} src={TODAY_PHOTO_SRC} onOpen={ignore} />
      </PictureOfDayPanel>
    ),
  },
  {
    key: "on-this-day",
    picture: (
      <PictureOfDayPanel onThisDay={2025} onOpenPhotos={ignore}>
        <PictureOfDay photo={TODAY_PHOTO} src={TODAY_PHOTO_SRC} onOpen={ignore} />
      </PictureOfDayPanel>
    ),
  },
  {
    key: "empty",
    picture: (
      <PictureOfDayPanel onOpenPhotos={ignore}>
        <PictureOfDayEmpty onOpenPhotos={ignore} canUpload />
      </PictureOfDayPanel>
    ),
  },
  {
    key: "small-empty",
    picture: (
      <PictureOfDayPanel onOpenPhotos={ignore}>
        <PictureOfDayEmpty onOpenPhotos={ignore} canUpload={false} />
      </PictureOfDayPanel>
    ),
  },
  {
    key: "loading",
    picture: (
      <PictureOfDayPanel onOpenPhotos={ignore}>
        <PictureOfDaySkeleton />
      </PictureOfDayPanel>
    ),
  },
];

const styles = stylex.create({
  hero: {
    width: 400,
    minHeight: 640,
  },
  picture: {
    width: 400,
    height: 360,
    display: "flex",
  },
  zone: {
    width: 560,
    height: 760,
    display: "flex",
    flexDirection: "column",
  },
  small: {
    width: 358,
    height: "auto",
  },
  narrow: {
    width: 430,
  },
  normal: {
    width: 520,
    height: "auto",
  },
  side: {
    width: 400,
  },
});

const schedule = {
  tags: GALLERY_FAMILY,
  selected: new Set(GALLERY_FAMILY.map((one) => one.id)),
  whoSheet: false,
  onFilter: ignore,
  day: "2026-10-09",
  now: NOW,
  clock: "12h",
  breakpoint: "large",
  iconActions: false,
  weather: { hourly: hourlyOn(9), unit: "F" },
  upcoming: COMING_UP_EVENTS,
  onOpenEvent: ignore,
  onAddEvent: ignore,
  onAddSlot: ignore,
  onOpenCalendar: ignore,
  ...failure,
  xstyle: styles.zone,
} as const;

const notes = {
  now: NOW,
  clock: "12h",
  onOpenNote: ignore,
  onAddNote: ignore,
  onOpenNotes: ignore,
  breakpoint: "normal",
  ...failure,
  xstyle: styles.side,
} as const;

const weather = {
  unit: "F",
  clock: "12h",
  retryIn: 1,
  onOpenWeather: ignore,
  onSetLocation: ignore,
} as const;

const WEATHERS = [
  { key: "rain", state: { kind: "ready", data: [FULL_WEATHER] } },
  { key: "dry", state: { kind: "ready", data: [TODAY_WEATHER] } },
  { key: "saved", state: { kind: "ready", data: [TODAY_WEATHER], updatedAt: UPDATED_AT } },
  { key: "empty", state: { kind: "empty" } },
  { key: "failed", state: { kind: "failed" } },
  { key: "loading", state: { kind: "loading" } },
] as const;

export function TodayGallery({ season }: { season: Season }) {
  return (
    <GalleryGroup title={gallery.groups.today}>
      {[NOW_HERO, NEXT_HERO].map((hero) => (
        <TodayHero
          tz={GALLERY_TZ}
          key={hero.kind}
          season={season}
          time={NOW}
          clock="12h"
          breakpoint="large"
          weather={<NowWeather tz={GALLERY_TZ} state={WEATHERS[0].state} {...weather} />}
          xstyle={styles.hero}
        >
          <HeroSummary
            tz={GALLERY_TZ}
            hero={hero}
            tags={GALLERY_FAMILY}
            clock="12h"
            onOpenEvent={ignore}
          />
        </TodayHero>
      ))}
      {OPEN_DAYS.map(({ key, hero, now, events }) => (
        <TodayHero
          tz={GALLERY_TZ}
          key={key}
          season={season}
          time={now}
          clock="12h"
          breakpoint="large"
          weather={<NowWeather tz={GALLERY_TZ} state={WEATHERS[0].state} {...weather} />}
          xstyle={styles.hero}
        >
          <OpenDay
            hero={hero}
            ribbon={dayRibbon(events, now, new Date(SUNSET), GALLERY_TZ)}
            now={now}
            clock="12h"
            tz={GALLERY_TZ}
          />
        </TodayHero>
      ))}
      {WEATHERS.slice(1).map(({ key, state }) => (
        <TodayHero
          tz={GALLERY_TZ}
          key={key}
          season={season}
          time={NOW}
          clock="24h"
          breakpoint="large"
          weather={<NowWeather tz={GALLERY_TZ} state={state} {...weather} />}
          xstyle={styles.hero}
        >
          {key === "loading" ? (
            <HeroSkeleton />
          ) : (
            <HeroSummary
              tz={GALLERY_TZ}
              hero={NOW_HERO}
              tags={GALLERY_FAMILY}
              clock="24h"
              onOpenEvent={ignore}
            />
          )}
        </TodayHero>
      ))}
      <TodayHero
        tz={GALLERY_TZ}
        season={season}
        time={NOW}
        clock="12h"
        breakpoint="small"
        weather={<NowWeather tz={GALLERY_TZ} state={WEATHERS[0].state} {...weather} small />}
        xstyle={styles.small}
      >
        <HeroSummary
          tz={GALLERY_TZ}
          hero={NOW_HERO}
          tags={GALLERY_FAMILY}
          clock="12h"
          onOpenEvent={ignore}
        />
      </TodayHero>
      <TodayHero
        tz={GALLERY_TZ}
        season={season}
        time={NOW}
        clock="12h"
        breakpoint="small"
        weather={<NowWeather tz={GALLERY_TZ} state={WEATHERS[0].state} {...weather} small />}
        xstyle={styles.small}
      >
        <OpenDay
          hero={WIDE}
          ribbon={dayRibbon([], NOW, new Date(SUNSET), GALLERY_TZ)}
          now={NOW}
          clock="12h"
          tz={GALLERY_TZ}
        />
      </TodayHero>
      {PICTURES.map(({ key, picture }) => (
        <div key={key} {...stylex.props(styles.picture)}>
          {picture}
        </div>
      ))}
      <TodaySchedule tz={GALLERY_TZ} state={{ kind: "ready", data: TODAY_EVENTS }} {...schedule} />
      <TodaySchedule
        tz={GALLERY_TZ}
        state={{ kind: "ready", data: TODAY_WITH_ALL_DAY }}
        {...schedule}
        iconActions
      />
      <TodaySchedule
        tz={GALLERY_TZ}
        state={{ kind: "ready", data: [ALL_DAY_EVENTS.grandpa, ...TODAY_MANY] }}
        {...schedule}
        iconActions
      />
      <TodaySchedule
        tz={GALLERY_TZ}
        state={{ kind: "ready", data: TODAY_WITH_ALL_DAY }}
        {...schedule}
        breakpoint="small"
        iconActions
        xstyle={[styles.zone, styles.small]}
      />
      <TodaySchedule
        tz={GALLERY_TZ}
        state={{ kind: "ready", data: TODAY_MANY }}
        {...schedule}
        breakpoint="normal"
        iconActions
        xstyle={[styles.zone, styles.normal]}
      />
      <TodaySchedule
        tz={GALLERY_TZ}
        state={{ kind: "ready", data: TODAY_EVENTS }}
        {...schedule}
        xstyle={[styles.zone, styles.narrow]}
      />
      <TodaySchedule tz={GALLERY_TZ} state={{ kind: "empty" }} {...schedule} />
      <TodaySchedule tz={GALLERY_TZ} state={{ kind: "empty" }} {...schedule} upcoming={[]} />
      <TodaySchedule
        tz={GALLERY_TZ}
        state={{ kind: "ready", data: [ALL_DAY_EVENTS.grandpa] }}
        {...schedule}
        iconActions
      />
      <TodaySchedule
        tz={GALLERY_TZ}
        state={{ kind: "empty" }}
        {...schedule}
        breakpoint="small"
        iconActions
        xstyle={[styles.zone, styles.small]}
      />
      <TodaySchedule tz={GALLERY_TZ} state={{ kind: "loading" }} {...schedule} />
      <TodaySchedule tz={GALLERY_TZ} state={{ kind: "failed" }} {...schedule} />
      <TodaySchedule
        tz={GALLERY_TZ}
        state={{ kind: "ready", data: TODAY_EVENTS, updatedAt: UPDATED_AT }}
        {...schedule}
      />
      <TodayNotes tz={GALLERY_TZ} state={{ kind: "ready", data: TODAY_NOTES }} {...notes} />
      <TodayNotes tz={GALLERY_TZ} state={{ kind: "ready", data: BOARD_NOTES }} {...notes} />
      <TodayNotes tz={GALLERY_TZ} state={{ kind: "empty" }} {...notes} />
      <TodayNotes tz={GALLERY_TZ} state={{ kind: "loading" }} {...notes} />
      <TodayNotes tz={GALLERY_TZ} state={{ kind: "failed" }} {...notes} />
    </GalleryGroup>
  );
}

function eventHero(now: Date): EventHero<CalendarEvent> {
  const hero = todayHero(TODAY_EVENTS, now, GALLERY_TZ);

  if (!hasEvent(hero)) throw new Error("The gallery day has no event at this time");

  return hero;
}
