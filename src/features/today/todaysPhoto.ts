import { copy } from "@/copy";
import type { Photo } from "@/domain/schemas";
import { dailyMoments, type TitleSource, titleSource } from "@/domain/todaysPhoto";
import { photoDate, type UploadTile } from "@/features/photos";

export type PhotoText = { title: string; caption: string; name: string };

export type FirstUpload = { preview?: string; percent: number; status: string };

type RunningTile = Extract<UploadTile, { percent: number }>;

const SEPARATOR = " · ";

const text = copy.today.photo;

export function photoText(
  photo: Photo,
  onThisDay: number | undefined,
  thisYear: number,
): PhotoText {
  const date = photoDate(photo, thisYear);

  const source = titleSource(photo);

  const title = titleText(photo, source, date);

  const parts =
    onThisDay === undefined
      ? captionParts(photo, source, date)
      : [text.onThisDay, String(onThisDay)];

  return { title, caption: parts.join(SEPARATOR), name: text.name([title, ...parts]) };
}

export function firstUpload(tiles: readonly UploadTile[]): FirstUpload | undefined {
  const running = tiles.filter(isRunning);

  const first = running[0];

  if (first === undefined) return undefined;

  const percent = Math.round(running.reduce((sum, tile) => sum + tile.percent, 0) / running.length);

  return {
    ...(first.preview && { preview: first.preview }),
    percent,
    status: uploadStatus(running, percent),
  };
}

export function momentsLine(dayKey: string): string {
  const moments = dailyMoments(text.empty.moments, dayKey).join(", ");

  return text.empty.body(moments.charAt(0).toUpperCase() + moments.slice(1));
}

function titleText(photo: Photo, source: TitleSource, date: string): string {
  if (source === "place") return photo.place ?? "";

  return source === "date" ? date : photo.title;
}

function captionParts(photo: Photo, source: TitleSource, date: string): string[] {
  if (source === "date") return [];

  if (source === "place") return [date];

  return photo.place ? [date, photo.place] : [date];
}

function isRunning(tile: UploadTile): tile is RunningTile {
  return tile.state === "uploading" || tile.state === "paused";
}

function uploadStatus(running: readonly RunningTile[], percent: number): string {
  if (running.every((tile) => tile.state === "paused")) return text.upload.paused;

  if (percent === 0) return text.upload.waiting;

  return running.length > 1
    ? text.upload.several(running.length, percent)
    : text.upload.one(percent);
}
