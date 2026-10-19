import * as stylex from "@stylexjs/stylex";
import type { Season } from "@/domain/schemas";
import { todayHero } from "@/domain/todayHero";
import {
  HeroSkeleton,
  HeroSummary,
  NowWeather,
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

const ignore = () => {};

const UPDATED_AT = octoberAt(9, 9, 32).toISOString();

const failure = { retryIn: 1, onRetry: ignore } as const;

const LATER = octoberAt(9, 9, 45);

const EVENING = octoberAt(9, 19, 0);

const NOW_HERO = todayHero(TODAY_EVENTS, NOW, GALLERY_TZ);

const HEROES = [
  NOW_HERO,
  todayHero(TODAY_EVENTS, LATER, GALLERY_TZ),
  todayHero(TODAY_EVENTS, EVENING, GALLERY_TZ),
  todayHero([], NOW, GALLERY_TZ),
];

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
        <PictureOfDayEmpty onUpload={ignore} />
      </PictureOfDayPanel>
    ),
  },
  {
    key: "phone-empty",
    picture: <PictureOfDayPanel onOpenPhotos={ignore}>{null}</PictureOfDayPanel>,
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
    width: 520,
    display: "flex",
    flexDirection: "column",
  },
  side: {
    width: 400,
  },
});

const schedule = {
  members: GALLERY_FAMILY,
  now: NOW,
  clock: "12h",
  compact: false,
  iconActions: false,
  rows: 8,
  onOpenEvent: ignore,
  onAddEvent: ignore,
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
  columns: 2,
  limit: 2,
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
      {HEROES.map((hero) => (
        <TodayHero
          tz={GALLERY_TZ}
          key={hero.kind}
          season={season}
          time={NOW}
          clock="12h"
          weather={<NowWeather tz={GALLERY_TZ} {...WEATHERS[0]} {...weather} />}
          xstyle={styles.hero}
        >
          <HeroSummary
            tz={GALLERY_TZ}
            hero={hero}
            members={GALLERY_FAMILY}
            clock="12h"
            onOpenEvent={ignore}
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
          weather={<NowWeather tz={GALLERY_TZ} state={state} {...weather} />}
          xstyle={styles.hero}
        >
          {key === "loading" ? (
            <HeroSkeleton />
          ) : (
            <HeroSummary
              tz={GALLERY_TZ}
              hero={NOW_HERO}
              members={GALLERY_FAMILY}
              clock="24h"
              onOpenEvent={ignore}
            />
          )}
        </TodayHero>
      ))}
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
      />
      <TodaySchedule
        tz={GALLERY_TZ}
        state={{ kind: "ready", data: TODAY_WITH_ALL_DAY }}
        {...schedule}
        compact
        iconActions
      />
      <TodaySchedule
        tz={GALLERY_TZ}
        state={{ kind: "ready", data: TODAY_MANY }}
        {...schedule}
        rows={5}
        iconActions
      />
      <TodaySchedule
        tz={GALLERY_TZ}
        state={{ kind: "ready", data: [ALL_DAY_EVENTS.grandpa, ...TODAY_MANY.slice(1)] }}
        {...schedule}
        rows={6}
        compact
      />
      <TodaySchedule tz={GALLERY_TZ} state={{ kind: "empty" }} {...schedule} />
      <TodaySchedule tz={GALLERY_TZ} state={{ kind: "loading" }} {...schedule} />
      <TodaySchedule
        tz={GALLERY_TZ}
        state={{ kind: "ready", data: TODAY_EVENTS }}
        {...schedule}
        compact
        iconActions
      />
      <TodaySchedule tz={GALLERY_TZ} state={{ kind: "failed" }} {...schedule} />
      <TodaySchedule
        tz={GALLERY_TZ}
        state={{ kind: "ready", data: TODAY_EVENTS, updatedAt: UPDATED_AT }}
        {...schedule}
      />
      <TodayNotes tz={GALLERY_TZ} state={{ kind: "ready", data: TODAY_NOTES }} {...notes} />
      <TodayNotes
        tz={GALLERY_TZ}
        state={{ kind: "ready", data: TODAY_NOTES }}
        {...notes}
        columns={1}
        limit={1}
      />
      <TodayNotes tz={GALLERY_TZ} state={{ kind: "empty" }} {...notes} />
      <TodayNotes tz={GALLERY_TZ} state={{ kind: "loading" }} {...notes} />
      <TodayNotes tz={GALLERY_TZ} state={{ kind: "failed" }} {...notes} />
    </GalleryGroup>
  );
}
