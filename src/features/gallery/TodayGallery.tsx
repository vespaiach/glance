import * as stylex from "@stylexjs/stylex";
import type { Season } from "@/domain/schemas";
import { todayHero } from "@/domain/todayHero";
import {
  HeroSkeleton,
  HeroSummary,
  PictureOfDay,
  PictureOfDayEmpty,
  PictureOfDaySkeleton,
  TodayHero,
  TodayNotes,
  TodaySchedule,
  TodayWeather,
} from "@/features/today";
import { GalleryGroup } from "./GalleryGroup";
import {
  ALL_DAY_EVENTS,
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
    picture: <PictureOfDay photo={TODAY_PHOTO} src={TODAY_PHOTO_SRC} onOpen={ignore} />,
  },
  {
    key: "on-this-day",
    picture: (
      <PictureOfDay photo={TODAY_PHOTO} onThisDay={2025} src={TODAY_PHOTO_SRC} onOpen={ignore} />
    ),
  },
  { key: "empty", picture: <PictureOfDayEmpty onUpload={ignore} /> },
  { key: "photo-background", picture: null },
];

const styles = stylex.create({
  hero: {
    width: 400,
    minHeight: 520,
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
  ...failure,
  xstyle: styles.side,
} as const;

const weather = {
  unit: "F",
  clock: "12h",
  onSetLocation: ignore,
  ...failure,
  xstyle: styles.side,
} as const;

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
          xstyle={styles.hero}
        >
          <HeroSummary tz={GALLERY_TZ} hero={hero} clock="12h" onOpenEvent={ignore} />
        </TodayHero>
      ))}
      {PICTURES.map(({ key, picture }) => (
        <TodayHero
          tz={GALLERY_TZ}
          key={key}
          season={season}
          time={NOW}
          clock="12h"
          picture={picture}
          xstyle={styles.hero}
        >
          <HeroSummary tz={GALLERY_TZ} hero={NOW_HERO} clock="12h" onOpenEvent={ignore} />
        </TodayHero>
      ))}
      <TodayHero
        tz={GALLERY_TZ}
        season={season}
        time={NOW}
        clock="24h"
        picture={<PictureOfDaySkeleton />}
        xstyle={styles.hero}
      >
        <HeroSkeleton />
      </TodayHero>
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
      <TodayWeather tz={GALLERY_TZ} state={{ kind: "ready", data: [TODAY_WEATHER] }} {...weather} />
      <TodayWeather tz={GALLERY_TZ} state={{ kind: "empty" }} {...weather} />
      <TodayWeather tz={GALLERY_TZ} state={{ kind: "loading" }} {...weather} />
      <TodayWeather tz={GALLERY_TZ} state={{ kind: "failed" }} {...weather} />
      <TodayWeather
        tz={GALLERY_TZ}
        state={{ kind: "ready", data: [TODAY_WEATHER], updatedAt: UPDATED_AT }}
        {...weather}
      />
      <TodayNotes tz={GALLERY_TZ} state={{ kind: "ready", data: TODAY_NOTES }} {...notes} />
      <TodayNotes
        tz={GALLERY_TZ}
        state={{ kind: "ready", data: TODAY_NOTES }}
        {...notes}
        columns={1}
      />
      <TodayNotes tz={GALLERY_TZ} state={{ kind: "empty" }} {...notes} />
      <TodayNotes tz={GALLERY_TZ} state={{ kind: "loading" }} {...notes} />
      <TodayNotes tz={GALLERY_TZ} state={{ kind: "failed" }} {...notes} />
    </GalleryGroup>
  );
}
