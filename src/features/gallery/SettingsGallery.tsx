import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { changeBackground } from "@/domain/background";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import type { Season } from "@/domain/schemas";
import { BackgroundView } from "@/features/background";
import { SettingsView } from "@/features/settings";
import { GalleryGroup } from "./GalleryGroup";
import { GALLERY_PHOTOS, gallery, galleryPhotoSrc, NOW, UPLOAD_SAMPLES } from "./samples";

type SettingsProps = ComponentProps<typeof SettingsView>;

type BackgroundProps = ComponentProps<typeof BackgroundView>;

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

function settingsBase(season: Season): SettingsProps {
  return {
    account: ACCOUNT,
    settings: DEFAULT_SETTINGS,
    season,
    background: { mode: "season" },
    breakpoint: "wide",
    onChange: ignore,
    onOpenBackground: ignore,
    onPreviewAmbient: ignore,
    onSignOut: ignore,
  };
}

const BACKGROUND_BASE: BackgroundProps = {
  state: { kind: "ready", data: GALLERY_PHOTOS },
  background: DEFAULT_SETTINGS.background,
  now: NOW,
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
