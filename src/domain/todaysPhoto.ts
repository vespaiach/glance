import { isCameraName } from "./photoName";
import type { Photo } from "./schemas";
import { addDays, dateKey, parseDateKey } from "./zone";

export type PhotoRow = Photo & { deletedAt?: string };

export type TodaysPhotoPick = { photo: PhotoRow; onThisDay?: number };

export type TitleSource = "title" | "place" | "date";

type Entry = { row: PhotoRow; uploaded: string; deleted?: string };

type Dated = { entry: Entry; taken: string };

type Replay = { cycle: number; queue: Entry[]; pick?: Entry; year?: number };

const byUpload = (a: Entry, b: Entry) =>
  a.row.createdAt.localeCompare(b.row.createdAt) || a.row.id.localeCompare(b.row.id);

const yearOf = (key: string) => Number(key.slice(0, 4));

const monthDay = (key: string) => key.slice(5);

const DAY_MS = 86_400_000;

const MOMENTS_SHOWN = 3;

type Index = {
  entries: readonly Entry[];
  byDay: Map<string, Entry[]>;
  byDate: Map<string, Dated[]>;
};

type Day = { index: Index; key: string; seed: string; skip?: string };

export function todaysPhoto(
  photos: readonly PhotoRow[],
  dayKey: string,
  tz: string,
  seed: string,
  skip?: string,
): TodaysPhotoPick | undefined {
  const entries = photos.map((row) => entryOf(row, tz)).sort(byUpload);

  const first = entries[0]?.uploaded;

  if (first === undefined || first > dayKey) return undefined;

  const index = indexOf(entries);

  let replay: Replay = { cycle: -1, queue: [] };

  for (let key = first; key < dayKey; key = addDays(key, 1)) {
    replay = replayDay(replay, { index, key, seed });
  }

  return pickOf(replayDay(replay, { index, key: dayKey, seed, skip }));
}

export function titleSource(photo: Photo): TitleSource {
  if (!isFileTitle(photo)) return "title";

  return photo.place ? "place" : "date";
}

export function dailyMoments<T>(items: readonly T[], dayKey: string): T[] {
  const start = dayOfYear(dayKey);

  return Array.from(
    { length: Math.min(MOMENTS_SHOWN, items.length) },
    (_, n) => items[(start + n) % items.length] as T,
  );
}

function isFileTitle({ title, fileName }: Photo): boolean {
  const trimmed = title.trim();

  return trimmed === "" || isCameraName(trimmed) || trimmed === fileName?.replace(/\.[^.]+$/, "");
}

function dayOfYear(dayKey: string): number {
  const date = parseDateKey(dayKey);

  return (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 0)) / DAY_MS;
}

function entryOf(row: PhotoRow, tz: string): Entry {
  const uploaded = dateKey(new Date(row.createdAt), tz);

  if (row.deletedAt === undefined) return { row, uploaded };

  return { row, uploaded, deleted: dateKey(new Date(row.deletedAt), tz) };
}

function aliveOn(entry: Entry, key: string): boolean {
  return entry.deleted === undefined || entry.deleted > key;
}

function hash(text: string): number {
  let value = 0x811c9dc5;

  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 0x01000193);

  return value >>> 0;
}

function shuffled(entries: readonly Entry[], seed: string, cycle: number): Entry[] {
  const rank = new Map(entries.map((entry) => [entry, hash(`${seed}:${cycle}:${entry.row.id}`)]));

  return [...entries].sort(
    (a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0) || a.row.id.localeCompare(b.row.id),
  );
}

function groupBy<T>(entries: readonly T[], keyOf: (entry: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const entry of entries) {
    const group = groups.get(keyOf(entry));

    if (group) group.push(entry);
    else groups.set(keyOf(entry), [entry]);
  }

  return groups;
}

function indexOf(entries: readonly Entry[]): Index {
  const byDay = groupBy(entries, (entry) => entry.uploaded);

  const byDate = groupBy(entries.flatMap(datedOf), (dated) => monthDay(dated.taken));

  return { entries, byDay, byDate };
}

function datedOf(entry: Entry): Dated[] {
  return entry.row.takenOn === undefined ? [] : [{ entry, taken: entry.row.takenOn }];
}

function onThisDay(index: Index, key: string, skip?: string): Dated | undefined {
  const matches = (index.byDate.get(monthDay(key)) ?? []).filter(
    ({ entry, taken }) =>
      entry.uploaded < key &&
      aliveOn(entry, key) &&
      yearOf(taken) < yearOf(key) &&
      entry.row.id !== skip,
  );

  return matches.sort((a, b) => yearOf(a.taken) - yearOf(b.taken) || byUpload(a.entry, b.entry))[0];
}

function cycleStart(replay: Replay, { index, key, seed }: Day): Replay {
  const tags = index.entries.filter((entry) => entry.uploaded < key && aliveOn(entry, key));

  return { cycle: replay.cycle + 1, queue: shuffled(tags, seed, replay.cycle + 1) };
}

function fromNextAlive(queue: readonly Entry[], key: string): Entry[] {
  const next = queue.findIndex((entry) => aliveOn(entry, key));

  return next === -1 ? [] : queue.slice(next);
}

function replayDay(replay: Replay, day: Day): Replay {
  const { index, key, skip } = day;

  const special = onThisDay(index, key, skip);

  const live = { ...replay, queue: fromNextAlive(replay.queue, key) };

  const started = special || live.queue.length > 0 ? live : cycleStart(live, day);

  const queue = [...started.queue, ...(index.byDay.get(key) ?? [])];

  if (special) return { ...started, queue, pick: special.entry, year: yearOf(special.taken) };

  const { year: _year, ...rest } = { ...started, queue };

  return takeTurn(rest, day);
}

function takeTurn(replay: Replay, day: Day): Replay {
  const ahead = [...replay.queue, ...nextCycle(replay, day)];

  const turn = Math.max(
    0,
    ahead.findIndex((entry) => entry.row.id !== day.skip),
  );

  return { ...replay, queue: ahead.toSpliced(turn, 1), pick: ahead[turn] };
}

function nextCycle(replay: Replay, day: Day): Entry[] {
  const { skip } = day;

  if (skip === undefined || replay.queue.some((entry) => entry.row.id !== skip)) return [];

  return cycleStart(replay, day).queue;
}

function pickOf({ pick, year }: Replay): TodaysPhotoPick | undefined {
  if (pick === undefined) return undefined;

  return year === undefined ? { photo: pick.row } : { photo: pick.row, onThisDay: year };
}
