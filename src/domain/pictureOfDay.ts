import type { Photo } from "./schemas";
import { localDayNumber } from "./time";

const byUpload = (a: Photo, b: Photo) =>
  a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

export function pictureOfDay(photos: readonly Photo[], now: Date): Photo | undefined {
  if (photos.length === 0) return undefined;

  const ordered = [...photos].sort(byUpload);

  return ordered[localDayNumber(now) % ordered.length];
}
