import type { Photo } from "./schemas";
import { dayNumber } from "./zone";

const byUpload = (a: Photo, b: Photo) =>
  a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

export function pictureOfDay(photos: readonly Photo[], now: Date, tz: string): Photo | undefined {
  if (photos.length === 0) return undefined;

  const ordered = [...photos].sort(byUpload);

  return ordered[dayNumber(now, tz) % ordered.length];
}
