import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import type { CalendarEvent, Season } from "@/domain/schemas";
import { AmbientView } from "@/features/ambient";
import { GalleryGroup } from "./GalleryGroup";
import {
  FULL_WEATHER,
  GALLERY_PHOTOS,
  GALLERY_TZ,
  gallery,
  galleryPhotoSrc,
  octoberAt,
} from "./samples";

type AmbientProps = ComponentProps<typeof AmbientView>;

type Demo = { key: string; small?: boolean } & Partial<AmbientProps>;

const ignore = () => {};

const EVENING = octoberAt(9, 19, 12);

const CONFERENCE: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-0000000000a1",
  title: "Parent-teacher conference",
  location: "Lincoln Elementary",
  startAt: octoberAt(14, 16).toISOString(),
  everyone: true,
  tagIds: [],
};

const AMBIENT_WEATHER = {
  ...FULL_WEATHER,
  current: { ...FULL_WEATHER.current, temp: 56, condition: "lightRain", icon: "cloud-rain" },
} as const;

const COAST = GALLERY_PHOTOS[0];

const styles = stylex.create({
  view: {
    width: 960,
    minHeight: 540,
  },
  small: {
    width: 390,
    minHeight: 844,
  },
});

const DEMOS: readonly Demo[] = [
  { key: "evening" },
  { key: "offline", offline: true },
  { key: "signed-out", signedOut: true },
  { key: "offline-signed-out", offline: true, signedOut: true },
  { key: "photo", ...(COAST && { photoSrc: galleryPhotoSrc(COAST.id) }) },
  { key: "bright-full", brightness: "full" },
  { key: "bright-low", brightness: "low" },
  { key: "celsius", clock: "24h", unit: "C" },
  {
    key: "nothing",
    place: undefined,
    weather: { kind: "empty" },
    nextEvent: { kind: "empty" },
  },
  { key: "loading", weather: { kind: "loading" }, nextEvent: { kind: "loading" } },
  { key: "small", small: true },
];

export function AmbientGallery({ season }: { season: Season }) {
  return (
    <GalleryGroup title={gallery.groups.ambientView}>
      {DEMOS.map(({ key, small, ...demo }) => (
        <AmbientView
          key={key}
          {...ambientBase(season)}
          {...demo}
          xstyle={small ? styles.small : styles.view}
        />
      ))}
    </GalleryGroup>
  );
}

function ambientBase(season: Season): AmbientProps {
  return {
    season,
    time: EVENING,
    clock: "12h",
    tz: GALLERY_TZ,
    offline: false,
    signedOut: false,
    place: "Portland, OR",
    weather: { kind: "ready", data: [AMBIENT_WEATHER] },
    unit: "F",
    nextEvent: { kind: "ready", data: [CONFERENCE] },
    dim: 0.6,
    brightness: "medium",
    onWake: ignore,
  };
}
