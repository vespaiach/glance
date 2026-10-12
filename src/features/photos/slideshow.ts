import type { Photo } from "@/domain/schemas";
import { formatMonthDay, parseLocalDate } from "@/domain/time";

export function newestFirst(photos: readonly Photo[]): Photo[] {
  return [...photos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function wrapIndex(index: number, count: number): number {
  return ((index % count) + count) % count;
}

export function photoDate(photo: Photo): string {
  return formatMonthDay(parseLocalDate(photo.takenOn));
}

export function photoMeta(photo: Photo): string {
  return [photoDate(photo), photo.place].filter(Boolean).join(" · ");
}
