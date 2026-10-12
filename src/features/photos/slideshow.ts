import type { Photo } from "@/domain/schemas";
import { formatMonthDay } from "@/domain/time";
import { parseDateKey } from "@/domain/zone";

export function newestFirst(photos: readonly Photo[]): Photo[] {
  return [...photos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function wrapIndex(index: number, count: number): number {
  return ((index % count) + count) % count;
}

export function photoDate(photo: Photo): string {
  return formatMonthDay(parseDateKey(photo.takenOn), "UTC");
}

export function photoMeta(photo: Photo): string {
  return [photoDate(photo), photo.place].filter(Boolean).join(" · ");
}

export const SLIDE_MS = 8_000;

export type Slideshow =
  | { kind: "playing"; from: number; since: Date }
  | { kind: "paused"; index: number };

export type SlideshowAction =
  | { type: "select"; index: number; at: Date }
  | { type: "step"; delta: number; at: Date }
  | { type: "toggle"; at: Date };

export function startSlideshow(at: Date, index = 0): Slideshow {
  return { kind: "playing", from: index, since: at };
}

export function slideIndex(show: Slideshow, now: Date): number {
  if (show.kind === "paused") return show.index;

  const slides = Math.floor((now.getTime() - show.since.getTime()) / SLIDE_MS);

  return show.from + Math.max(0, slides);
}

function showIndex(show: Slideshow, index: number, at: Date): Slideshow {
  return show.kind === "paused" ? { kind: "paused", index } : startSlideshow(at, index);
}

export function slideshow(show: Slideshow, action: SlideshowAction): Slideshow {
  const shown = slideIndex(show, action.at);

  if (action.type === "select") return showIndex(show, action.index, action.at);

  if (action.type === "step") return showIndex(show, shown + action.delta, action.at);

  return show.kind === "paused"
    ? startSlideshow(action.at, shown)
    : { kind: "paused", index: shown };
}
