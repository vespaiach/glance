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
  gallery,
  NOW,
  TODAY_EVENTS,
  TODAY_NOTES,
  TODAY_PHOTO,
  TODAY_PHOTO_SRC,
  TODAY_WEATHER,
} from "./samples";

const ignore = () => {};

const UPDATED_AT = new Date(2026, 9, 9, 9, 32).toISOString();

const failure = { retryIn: 1, onRetry: ignore } as const;

const LATER = new Date(2026, 9, 9, 9, 45);

const EVENING = new Date(2026, 9, 9, 19, 0);

const HEROES = [
  todayHero(TODAY_EVENTS, NOW),
  todayHero(TODAY_EVENTS, LATER),
  todayHero(TODAY_EVENTS, EVENING),
  todayHero([], NOW),
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
        <TodayHero key={hero.kind} season={season} time={NOW} clock="12h" xstyle={styles.hero}>
          <HeroSummary hero={hero} clock="12h" onOpenEvent={ignore} />
        </TodayHero>
      ))}
      <TodayHero season={season} time={NOW} clock="24h" xstyle={styles.hero}>
        <HeroSkeleton />
      </TodayHero>
      <TodaySchedule state={{ kind: "ready", data: TODAY_EVENTS }} {...schedule}>
        <PictureOfDay photo={TODAY_PHOTO} src={TODAY_PHOTO_SRC} />
      </TodaySchedule>
      <TodaySchedule state={{ kind: "empty" }} {...schedule}>
        <PictureOfDayEmpty canUpload onUpload={ignore} />
      </TodaySchedule>
      <TodaySchedule state={{ kind: "loading" }} {...schedule}>
        <PictureOfDaySkeleton />
      </TodaySchedule>
      <TodaySchedule state={{ kind: "ready", data: TODAY_EVENTS }} {...schedule} compact>
        <PictureOfDayEmpty canUpload={false} onUpload={ignore} />
      </TodaySchedule>
      <TodaySchedule state={{ kind: "failed" }} {...schedule} />
      <TodaySchedule
        state={{ kind: "ready", data: TODAY_EVENTS, updatedAt: UPDATED_AT }}
        {...schedule}
      />
      <TodayWeather state={{ kind: "ready", data: [TODAY_WEATHER] }} {...weather} />
      <TodayWeather state={{ kind: "empty" }} {...weather} />
      <TodayWeather state={{ kind: "loading" }} {...weather} />
      <TodayWeather state={{ kind: "failed" }} {...weather} />
      <TodayWeather
        state={{ kind: "ready", data: [TODAY_WEATHER], updatedAt: UPDATED_AT }}
        {...weather}
      />
      <TodayNotes state={{ kind: "ready", data: TODAY_NOTES }} {...notes} />
      <TodayNotes state={{ kind: "empty" }} {...notes} />
      <TodayNotes state={{ kind: "loading" }} {...notes} />
      <TodayNotes state={{ kind: "failed" }} {...notes} />
    </GalleryGroup>
  );
}
