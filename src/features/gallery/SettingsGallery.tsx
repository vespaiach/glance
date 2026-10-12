import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { changeBackground } from "@/domain/background";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import type { Season } from "@/domain/schemas";
import { BackgroundView } from "@/features/background";
import { LocationView, SettingsView } from "@/features/settings";
import type { WeatherSetupState } from "@/features/weather";
import { GalleryGroup } from "./GalleryGroup";
import {
  GALLERY_PHOTOS,
  GALLERY_TZ,
  gallery,
  galleryPhotoSrc,
  NOW,
  PLACES,
  UPLOAD_SAMPLES,
} from "./samples";

type SettingsProps = ComponentProps<typeof SettingsView>;

type BackgroundProps = ComponentProps<typeof BackgroundView>;

type LocationProps = ComponentProps<typeof LocationView>;

type Demo<T> = { key: string; phone?: boolean } & Partial<T>;

const ignore = () => {};

const COAST = GALLERY_PHOTOS[0];

const ACCOUNT = { name: "Maria", email: "maria@example.com" };

const PHOTO = { ...DEFAULT_SETTINGS.background, mode: "photo", photoId: COAST?.id } as const;

const SLIDESHOW = changeBackground(
  PHOTO,
  GALLERY_PHOTOS,
  { mode: "slideshow", rotate: "weekly" },
  NOW,
  GALLERY_TZ,
);

const styles = stylex.create({
  view: {
    width: 1200,
  },
  phone: {
    width: 350,
  },
});

function settingsDemos(season: Season): readonly Demo<SettingsProps>[] {
  return [
    { key: "auto" },
    {
      key: "fixed",
      settings: { ...DEFAULT_SETTINGS, season, clock: "24h", tempUnit: "C", noteExpiry: null },
      background: COAST && { mode: "slideshow", photo: COAST, rotate: "daily" },
    },
    { key: "photo", background: COAST && { mode: "photo", photo: COAST } },
    { key: "phone", phone: true, breakpoint: "phone" },
  ];
}

const BACKGROUND_DEMOS: readonly Demo<BackgroundProps>[] = [
  { key: "season" },
  { key: "photo", background: PHOTO },
  { key: "slideshow", background: { ...SLIDESHOW, dim: 0.4 } },
  { key: "uploading", background: PHOTO, uploads: UPLOAD_SAMPLES.several },
  { key: "failed", background: PHOTO, uploads: UPLOAD_SAMPLES.failed },
  { key: "offline", background: PHOTO, uploads: UPLOAD_SAMPLES.paused, online: false },
  { key: "empty", state: { kind: "empty" } },
  { key: "loading", state: { kind: "loading" } },
  { key: "failed-zone", state: { kind: "failed" } },
  { key: "phone", phone: true, breakpoint: "phone", canUpload: false, background: PHOTO },
];

const [PORTLAND, MAINE] = PLACES;

const SOCCER = { title: "Soccer practice", startAt: "2026-10-09T22:30:00.000Z" };

function setupFor(state: WeatherSetupState, canLocate = true): LocationProps["setup"] {
  return {
    state,
    canLocate,
    type: ignore,
    submit: ignore,
    pick: ignore,
    locate: ignore,
    confirm: ignore,
    keep: ignore,
  };
}

const CONFIRM: WeatherSetupState = MAINE
  ? { step: "confirm-zone", draft: "Portland", place: MAINE }
  : { step: "editing", draft: "" };

const LOCATION_DEMOS: readonly Demo<LocationProps>[] = [
  { key: "set" },
  { key: "not-set", location: undefined },
  {
    key: "searching",
    setup: setupFor({ step: "searching", draft: "Portland", query: "Portland" }),
  },
  { key: "choose", setup: setupFor({ step: "choosing", draft: "Portland", matches: PLACES }) },
  { key: "locating", setup: setupFor({ step: "locating", draft: "" }) },
  { key: "denied", setup: setupFor({ step: "editing", draft: "", notice: "denied" }, false) },
  { key: "outside", setup: setupFor({ step: "editing", draft: "", notice: "outside" }) },
  { key: "confirm", setup: setupFor(CONFIRM) },
  { key: "phone", phone: true, breakpoint: "phone" },
  { key: "phone-confirm", phone: true, breakpoint: "phone", setup: setupFor(CONFIRM) },
];

const LOCATION_BASE: LocationProps = {
  location: PORTLAND,
  now: NOW,
  clock: "12h",
  setup: setupFor({ step: "editing", draft: "" }),
  example: SOCCER,
  breakpoint: "wide",
  onBack: ignore,
};

function settingsBase(season: Season): SettingsProps {
  return {
    account: ACCOUNT,
    settings: { ...DEFAULT_SETTINGS, ...(PORTLAND && { weatherLocation: PORTLAND }) },
    season,
    background: { mode: "season" },
    breakpoint: "wide",
    onChange: ignore,
    onOpenBackground: ignore,
    onOpenLocation: ignore,
    onPreviewAmbient: ignore,
    onSignOut: ignore,
  };
}

const BACKGROUND_BASE: BackgroundProps = {
  state: { kind: "ready", data: GALLERY_PHOTOS },
  retryIn: 1,
  onRetrySync: ignore,
  background: DEFAULT_SETTINGS.background,
  now: NOW,
  tz: GALLERY_TZ,
  uploads: [],
  online: true,
  canUpload: true,
  breakpoint: "wide",
  photoSrc: galleryPhotoSrc,
  onChange: ignore,
  onBack: ignore,
  onUpload: ignore,
  onRetry: ignore,
  onRemove: ignore,
};

export function SettingsGallery({ season }: { season: Season }) {
  return (
    <>
      <GalleryGroup title={gallery.groups.settingsView}>
        {settingsDemos(season).map(({ key, phone, ...demo }) => (
          <div key={key} {...stylex.props(phone ? styles.phone : styles.view)}>
            <SettingsView {...settingsBase(season)} {...demo} />
          </div>
        ))}
      </GalleryGroup>
      <GalleryGroup title={gallery.groups.locationView}>
        {LOCATION_DEMOS.map(({ key, phone, ...demo }) => (
          <div key={key} {...stylex.props(phone ? styles.phone : styles.view)}>
            <LocationView {...LOCATION_BASE} {...demo} />
          </div>
        ))}
      </GalleryGroup>
      <GalleryGroup title={gallery.groups.backgroundView}>
        {BACKGROUND_DEMOS.map(({ key, phone, ...demo }) => (
          <div key={key} {...stylex.props(phone ? styles.phone : styles.view)}>
            <BackgroundView {...BACKGROUND_BASE} {...demo} />
          </div>
        ))}
      </GalleryGroup>
    </>
  );
}
