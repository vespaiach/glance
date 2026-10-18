import { copy } from "@/copy";
import type { Photo } from "@/domain/schemas";
import { formatMonthDay } from "@/domain/time";
import { parseDateKey } from "@/domain/zone";

const GUESSED_FROM: Partial<Record<string, string>> = copy.photos.hint.from;

export const SLIDE_MS = 8_000;

export type SettledSlideshow =
  | { kind: "playing"; from: number; since: Date }
  | { kind: "paused"; index: number };

export type Slideshow = SettledSlideshow | { kind: "pinned"; photoId: string; since: Date };

export type SlideshowAction = { at: Date; ids: readonly string[] } & (
  | { type: "select"; index: number }
  | { type: "step"; delta: number }
  | { type: "toggle" }
  | { type: "pause" }
);

export function newestFirst(photos: readonly Photo[]): Photo[] {
  return [...photos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function wrapIndex(index: number, count: number): number {
  return ((index % count) + count) % count;
}

export function photoDate({ takenOn }: Photo, thisYear: number): string {
  if (takenOn === undefined) return copy.photos.noDate;

  const monthDay = formatMonthDay(parseDateKey(takenOn), "UTC");

  const year = Number(takenOn.slice(0, 4));

  return year === thisYear ? monthDay : copy.photos.datedInYear(monthDay, year);
}

export function photoMeta(photo: Photo, thisYear: number): string {
  return [photoDate(photo, thisYear), photo.place].filter(Boolean).join(" · ");
}

export function photoHint({ sources, checked }: Photo): string | undefined {
  if (checked) return undefined;

  const parts = guessText(guessFrom(sources.title), guessFrom(sources.takenOn));

  if (sources.place === "none") parts.push(copy.photos.hint.noPlace);

  return parts.length > 0 ? parts.join(" ") : undefined;
}

export function startSlideshow(at: Date, index = 0): SettledSlideshow {
  return { kind: "playing", from: index, since: at };
}

export function openSlideshow(at: Date, photoId: string | null): Slideshow {
  return photoId === null ? startSlideshow(at) : { kind: "pinned", photoId, since: at };
}

export function settleSlideshow(show: Slideshow, ids: readonly string[]): SettledSlideshow {
  if (show.kind !== "pinned") return show;

  const index = ids.indexOf(show.photoId);

  return index < 0 ? startSlideshow(show.since) : { kind: "paused", index };
}

export function slideIndex(show: SettledSlideshow, now: Date): number {
  if (show.kind === "paused") return show.index;

  const slides = Math.floor((now.getTime() - show.since.getTime()) / SLIDE_MS);

  return show.from + Math.max(0, slides);
}

export function slideshow(current: Slideshow, action: SlideshowAction): SettledSlideshow {
  const show = settleSlideshow(current, action.ids);

  const shown = slideIndex(show, action.at);

  if (action.type === "select") return showIndex(show, action.index, action.at);

  if (action.type === "step") return showIndex(show, shown + action.delta, action.at);

  if (action.type === "pause") return { kind: "paused", index: shown };

  return show.kind === "paused"
    ? startSlideshow(action.at, shown)
    : { kind: "paused", index: shown };
}

function guessFrom(source: string): string | undefined {
  return GUESSED_FROM[source];
}

function guessText(name: string | undefined, date: string | undefined): string[] {
  const { hint } = copy.photos;

  if (name && name === date) return [hint.both(name)];

  return [name && hint.name(name), date && hint.date(date)].filter((part) => part !== undefined);
}

function showIndex(show: SettledSlideshow, index: number, at: Date): SettledSlideshow {
  return show.kind === "paused" ? { kind: "paused", index } : startSlideshow(at, index);
}
