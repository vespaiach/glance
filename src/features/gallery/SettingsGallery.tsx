import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { changeBackground } from "@/domain/background";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import type { Season } from "@/domain/schemas";
import { DEFAULT_AMBIENT } from "@/domain/schemas";
import { GB } from "@/domain/storage";
import { BackgroundView } from "@/features/background";
import { AmbientScheduleView, LocationView, SettingsView } from "@/features/settings";
import type { WeatherSetupState } from "@/features/weather";
import { GalleryGroup } from "./GalleryGroup";
import {
  GALLERY_PHOTOS,
  GALLERY_TZ,
  gallery,
  galleryPhotoSrc,
  gallerySetup,
  NOW,
  PLACES,
  QR_SAMPLE_URL,
  SCREEN_SAMPLES,
  UPLOAD_SAMPLES,
} from "./samples";

type SettingsProps = ComponentProps<typeof SettingsView>;

type BackgroundProps = ComponentProps<typeof BackgroundView>;

type LocationProps = ComponentProps<typeof LocationView>;

type AmbientProps = ComponentProps<typeof AmbientScheduleView>;

type Demo<T> = { key: string; small?: boolean } & Partial<T>;

const ignore = () => {};

const COAST = GALLERY_PHOTOS[0];

const ACCOUNT = { name: "Maria", email: "maria@example.com" };

const QR_OPEN = {
  tile: { kind: "open", url: QR_SAMPLE_URL, issuedAt: NOW.toISOString() },
  secondsLeft: 125,
} as const;

const STORAGE_LIMIT = 5 * GB;

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
  small: {
    width: 350,
  },
  dialog: {
    contain: "layout paint",
    minHeight: 760,
  },
});

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
  { key: "small", small: true, breakpoint: "small", canUpload: false, background: PHOTO },
];

const [PORTLAND, MAINE] = PLACES;

const SOCCER = { title: "Soccer practice", startAt: "2026-10-09T22:30:00.000Z" };

const CONFIRM: WeatherSetupState = MAINE
  ? { step: "confirm-zone", draft: "Portland", place: MAINE }
  : { step: "editing", draft: "" };

const LOCATION_DEMOS: readonly Demo<LocationProps>[] = [
  { key: "set" },
  { key: "not-set", location: undefined },
  {
    key: "searching",
    setup: gallerySetup({ step: "searching", draft: "Portland", query: "Portland" }),
  },
  { key: "choose", setup: gallerySetup({ step: "choosing", draft: "Portland", matches: PLACES }) },
  { key: "locating", setup: gallerySetup({ step: "locating", draft: "" }) },
  { key: "denied", setup: gallerySetup({ step: "editing", draft: "", notice: "denied" }, false) },
  { key: "outside", setup: gallerySetup({ step: "editing", draft: "", notice: "outside" }) },
  { key: "confirm", setup: gallerySetup(CONFIRM) },
  { key: "small", small: true, breakpoint: "small" },
  { key: "small-confirm", small: true, breakpoint: "small", setup: gallerySetup(CONFIRM) },
];

const LOCATION_BASE: LocationProps = {
  location: PORTLAND,
  now: NOW,
  clock: "12h",
  setup: gallerySetup({ step: "editing", draft: "" }),
  example: SOCCER,
  breakpoint: "large",
  onBack: ignore,
};

const SPLIT = { ...DEFAULT_AMBIENT, mode: "split" } as const;

const AMBIENT_DEMOS: readonly Demo<AmbientProps>[] = [
  { key: "every-night" },
  { key: "pick-dim", initialPick: "all.s" },
  { key: "split", ambient: SPLIT, initialPick: "wknd.e" },
  { key: "same", ambient: { ...DEFAULT_AMBIENT, all: { start: "18:00", end: "18:00" } } },
  { key: "off", ambient: { ...DEFAULT_AMBIENT, mode: "off" }, brightness: "low" },
  { key: "clock-24", clock: "24h", idleTimeout: { on: false, minutes: 3 }, initialPick: "all.e" },
  { key: "small", small: true, breakpoint: "small", initialPick: "all.s" },
];

const AMBIENT_BASE: AmbientProps = {
  ambient: DEFAULT_AMBIENT,
  brightness: "medium",
  clock: "12h",
  idleTimeout: { on: true, minutes: 3 },
  breakpoint: "large",
  onChange: ignore,
  onBrightness: ignore,
  onBack: ignore,
  onPreview: ignore,
};

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
  breakpoint: "large",
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
        {settingsDemos(season).map(({ key, small, ...demo }) => (
          <div
            key={key}
            {...stylex.props(
              small ? styles.small : styles.view,
              (demo.signOut || demo.deleteAccount) && styles.dialog,
            )}
          >
            <SettingsView {...settingsBase(season)} {...demo} />
          </div>
        ))}
      </GalleryGroup>
      <GalleryGroup title={gallery.groups.locationView}>
        {LOCATION_DEMOS.map(({ key, small, ...demo }) => (
          <div key={key} {...stylex.props(small ? styles.small : styles.view)}>
            <LocationView {...LOCATION_BASE} {...demo} />
          </div>
        ))}
      </GalleryGroup>
      <GalleryGroup title={gallery.groups.ambientScheduleView}>
        {AMBIENT_DEMOS.map(({ key, small, ...demo }) => (
          <div key={key} {...stylex.props(small ? styles.small : styles.view)}>
            <AmbientScheduleView {...AMBIENT_BASE} {...demo} />
          </div>
        ))}
      </GalleryGroup>
      <GalleryGroup title={gallery.groups.backgroundView}>
        {BACKGROUND_DEMOS.map(({ key, small, ...demo }) => (
          <div key={key} {...stylex.props(small ? styles.small : styles.view)}>
            <BackgroundView {...BACKGROUND_BASE} {...demo} />
          </div>
        ))}
      </GalleryGroup>
    </>
  );
}

function settingsDemos(season: Season): readonly Demo<SettingsProps>[] {
  return [
    { key: "auto" },
    {
      key: "fixed",
      settings: {
        ...DEFAULT_SETTINGS,
        season,
        clock: "24h",
        tempUnit: "C",
        noteExpiry: { on: false, days: 7 },
      },
      background: COAST && { mode: "slideshow", photo: COAST, rotate: "daily" },
    },
    { key: "photo", background: COAST && { mode: "photo", photo: COAST } },
    {
      key: "timers-off",
      settings: {
        ...DEFAULT_SETTINGS,
        idleTimeout: { on: false, minutes: 12 },
        noteExpiry: { on: false, days: 14 },
        hideSidebarWhenIdle: false,
      },
    },
    { key: "notifications-30", settings: { ...DEFAULT_SETTINGS, notifyLead: 30 } },
    {
      key: "notifications-off",
      settings: { ...DEFAULT_SETTINGS, notifyLead: "off" },
      phone: { kind: "on" },
    },
    {
      key: "small-notifications-off",
      small: true,
      breakpoint: "small",
      settings: { ...DEFAULT_SETTINGS, notifyLead: "off" },
    },
    { key: "this-screen-only", screens: SCREEN_SAMPLES.slice(0, 1) },
    { key: "qr-open", qr: QR_OPEN },
    { key: "qr-issuing", qr: { tile: { kind: "issuing" }, secondsLeft: 180 } },
    { key: "qr-failed", qr: { tile: { kind: "failed" }, secondsLeft: 180 } },
    { key: "storage-almost", storage: { used: 4.6 * GB, limit: STORAGE_LIMIT } },
    { key: "storage-full", storage: { used: STORAGE_LIMIT, limit: STORAGE_LIMIT } },
    { key: "storage-unread", storage: undefined },
    { key: "offline", online: false },
    { key: "phone-ask", phone: { kind: "ask" } },
    { key: "phone-asking", phone: { kind: "asking" } },
    { key: "phone-denied", phone: { kind: "denied" } },
    { key: "phone-on", phone: { kind: "on" } },
    { key: "phone-turning-off", phone: { kind: "turning-off" } },
    { key: "small", small: true, breakpoint: "small" },
    { key: "small-phone-ask", small: true, breakpoint: "small", phone: { kind: "ask" } },
    { key: "small-phone-on", small: true, breakpoint: "small", phone: { kind: "on" } },
    {
      key: "small-storage-almost",
      small: true,
      breakpoint: "small",
      storage: { used: 4.6 * GB, limit: STORAGE_LIMIT },
    },
    { key: "small-qr-open", small: true, breakpoint: "small", qr: QR_OPEN },
    { key: "sign-out", signOut: { kind: "open" } },
    { key: "sign-out-offline", online: false, signOut: { kind: "open" } },
    { key: "sign-out-signing-out", signOut: { kind: "signing-out" } },
    { key: "sign-out-failed", signOut: { kind: "failed" } },
    { key: "small-sign-out", small: true, breakpoint: "small", signOut: { kind: "open" } },
    { key: "delete-account-ask", deleteAccount: { kind: "ask" } },
    { key: "delete-account-ack", deleteAccount: { kind: "ack" } },
    { key: "delete-account-deleting", deleteAccount: { kind: "deleting" } },
    { key: "delete-account-failed", deleteAccount: { kind: "failed" } },
    { key: "delete-account-offline", online: false },
    {
      key: "small-delete-account",
      small: true,
      breakpoint: "small",
      deleteAccount: { kind: "ack" },
    },
  ];
}

function settingsBase(season: Season): SettingsProps {
  return {
    account: ACCOUNT,
    screens: SCREEN_SAMPLES,
    storage: { used: 3.2 * GB, limit: STORAGE_LIMIT },
    now: NOW,
    tz: GALLERY_TZ,
    settings: { ...DEFAULT_SETTINGS, ...(PORTLAND && { weatherLocation: PORTLAND }) },
    season,
    background: { mode: "season" },
    breakpoint: "large",
    online: true,
    qr: { tile: { kind: "closed" }, secondsLeft: 180 },
    onShowQr: ignore,
    onCloseQr: ignore,
    onChange: ignore,
    onOpenBackground: ignore,
    onOpenLocation: ignore,
    onOpenAmbient: ignore,
    signOut: { kind: "closed" },
    onSignOut: ignore,
    onSignOutThisDevice: ignore,
    onSignOutAll: ignore,
    onCancelSignOut: ignore,
    deleteAccount: { kind: "closed" },
    counts: { events: 12, notes: 3, photos: 48, tags: 4 },
    onDeleteAccount: ignore,
    onToggleDeleteAccount: ignore,
    onConfirmDeleteAccount: ignore,
    onCancelDeleteAccount: ignore,
    phone: { kind: "unsupported" },
    onAllowPush: ignore,
    onTurnOffPush: ignore,
  };
}
