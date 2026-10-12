import type { AccountSettings, Photo } from "./schemas";

type Background = AccountSettings["background"];

export type ShownBackground =
  | { mode: "season" }
  | { mode: "photo"; photo: Photo }
  | { mode: "slideshow"; photo: Photo; rotate: Background["rotate"] };

export function shownBackground(background: Background, photos: readonly Photo[]): ShownBackground {
  const photo = photos.find((each) => each.id === background.photoId) ?? photos[0];

  if (background.mode === "season" || photo === undefined) return { mode: "season" };

  if (background.mode === "photo") return { mode: "photo", photo };

  return { mode: "slideshow", photo, rotate: background.rotate };
}

export function pickPhoto(mode: Background["mode"], photoId: string): Partial<Background> {
  return { mode: mode === "season" ? "photo" : mode, photoId };
}
