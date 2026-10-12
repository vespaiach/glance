import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import type { CalendarEvent, Season } from "@/domain/schemas";
import { AmbientView } from "@/features/ambient";
import { GalleryGroup } from "./GalleryGroup";
import { FULL_WEATHER, GALLERY_PHOTOS, gallery, galleryPhotoSrc } from "./samples";

type AmbientProps = ComponentProps<typeof AmbientView>;

type Demo = { key: string; phone?: boolean } & Partial<AmbientProps>;

const ignore = () => {};

const EVENING = new Date(2026, 9, 9, 19, 12);

const CONFERENCE: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-0000000000a1",
  title: "Parent-teacher conference",
  location: "Lincoln Elementary",
  startAt: new Date(2026, 9, 14, 16, 0).toISOString(),
  tone: 4,
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
  phone: {
    width: 390,
    minHeight: 844,
  },
});

const DEMOS: readonly Demo[] = [
  { key: "evening" },
  { key: "offline", offline: true },
  { key: "photo", ...(COAST && { photoSrc: galleryPhotoSrc(COAST.id) }) },
  { key: "celsius", clock: "24h", unit: "C" },
  { key: "nothing", weather: { kind: "empty" }, nextEvent: { kind: "empty" } },
  { key: "loading", weather: { kind: "loading" }, nextEvent: { kind: "loading" } },
  { key: "phone", phone: true },
];

function ambientBase(season: Season): AmbientProps {
  return {
    season,
    time: EVENING,
    clock: "12h",
    offline: false,
    weather: { kind: "ready", data: [AMBIENT_WEATHER] },
    unit: "F",
    nextEvent: { kind: "ready", data: [CONFERENCE] },
    dim: 0.5,
    onWake: ignore,
  };
}

export function AmbientGallery({ season }: { season: Season }) {
  return (
    <GalleryGroup title={gallery.groups.ambientView}>
      {DEMOS.map(({ key, phone, ...demo }) => (
        <AmbientView
          key={key}
          {...ambientBase(season)}
          {...demo}
          xstyle={phone ? styles.phone : styles.view}
        />
      ))}
    </GalleryGroup>
  );
}
