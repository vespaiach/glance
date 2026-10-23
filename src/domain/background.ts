import type { AccountSettings, Photo } from "./schemas";
import { dayNumber, wallTime } from "./zone";

type Background = AccountSettings["background"];

export type ShownBackground =
  | { mode: "season" }
  | { mode: "photo"; photo: Photo }
  | { mode: "slideshow"; photo: Photo; rotate: Background["rotate"] };

const DAYS_FROM_SUNDAY_TO_EPOCH = 4;

const byUpload = (a: Photo, b: Photo) =>
  a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

export function rotationStep(rotate: Background["rotate"], now: Date, tz: string): number {
  const day = dayNumber(now, tz);

  if (rotate === "hourly") return day * 24 + wallTime(now, tz).hour;

  if (rotate === "daily") return day;

  return Math.floor((day + DAYS_FROM_SUNDAY_TO_EPOCH) / 7);
}

export function shownBackground(
  background: Background,
  photos: readonly Photo[],
  now: Date,
  tz: string,
): ShownBackground {
  const ordered = uploadOrder(photos);

  if (background.mode === "season" || ordered.length === 0) return { mode: "season" };

  if (background.mode === "photo")
    return { mode: "photo", photo: ordered[anchorIndex(ordered, background.photoId)] as Photo };

  return {
    mode: "slideshow",
    photo: slideshowPhoto(ordered, background, now, tz),
    rotate: background.rotate,
  };
}

export function changeBackground(
  background: Background,
  photos: readonly Photo[],
  change: Partial<Background>,
  now: Date,
  tz: string,
): Background {
  const next = { ...background, ...change };

  const photoId = change.photoId ?? photoOnScreen(background, photos, now, tz);

  if (photoId === undefined || next.mode !== "slideshow") return { ...next, photoId };

  return { ...next, photoId: slideshowAnchor(photos, photoId, next.rotate, now, tz) ?? photoId };
}

export function backgroundAfterDelete(background: Background, photoId: string): Background {
  const shownPhotoGone = background.mode === "photo" && background.photoId === photoId;

  return shownPhotoGone ? { ...background, mode: "season" } : background;
}

export function pickPhoto(mode: Background["mode"], photoId: string): Partial<Background> {
  return { mode: mode === "season" ? "photo" : mode, photoId };
}

function uploadOrder(photos: readonly Photo[]): Photo[] {
  return [...photos].sort(byUpload);
}

function wrap(index: number, count: number): number {
  return ((index % count) + count) % count;
}

function anchorIndex(ordered: readonly Photo[], photoId: string | undefined): number {
  return Math.max(
    0,
    ordered.findIndex((each) => each.id === photoId),
  );
}

function slideshowPhoto(
  ordered: readonly Photo[],
  background: Background,
  now: Date,
  tz: string,
): Photo {
  const index = anchorIndex(ordered, background.photoId) + rotationStep(background.rotate, now, tz);

  return ordered[wrap(index, ordered.length)] as Photo;
}

function photoOnScreen(
  background: Background,
  photos: readonly Photo[],
  now: Date,
  tz: string,
): string | undefined {
  const shown = shownBackground(background, photos, now, tz);

  return shown.mode === "season" ? background.photoId : shown.photo.id;
}

function slideshowAnchor(
  photos: readonly Photo[],
  photoId: string,
  rotate: Background["rotate"],
  now: Date,
  tz: string,
): string | undefined {
  const ordered = uploadOrder(photos);

  const index = ordered.findIndex((each) => each.id === photoId) - rotationStep(rotate, now, tz);

  return ordered[wrap(index, ordered.length)]?.id;
}
