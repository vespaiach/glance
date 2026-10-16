import type { Photo } from "./schemas";
import { addDays, dateKey } from "./zone";

export type PhotoRow = Photo & { deletedAt?: string };

export type PictureOfDayPick = { photo: PhotoRow; onThisDay?: number };

type Entry = { row: PhotoRow; uploaded: string; deleted?: string };

type Replay = { cycle: number; queue: Entry[]; pick?: Entry; special?: boolean };

const byUpload = (a: Entry, b: Entry) =>
  a.row.createdAt.localeCompare(b.row.createdAt) || a.row.id.localeCompare(b.row.id);

const yearOf = (key: string) => Number(key.slice(0, 4));

const monthDay = (key: string) => key.slice(5);

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

type Index = {
  entries: readonly Entry[];
  byDay: Map<string, Entry[]>;
  byDate: Map<string, Entry[]>;
};

function groupBy(entries: readonly Entry[], keyOf: (entry: Entry) => string): Map<string, Entry[]> {
  const groups = new Map<string, Entry[]>();

  for (const entry of entries) {
    const group = groups.get(keyOf(entry));

    if (group) group.push(entry);
    else groups.set(keyOf(entry), [entry]);
  }

  return groups;
}

function indexOf(entries: readonly Entry[]): Index {
  const byDay = groupBy(entries, (entry) => entry.uploaded);

  const byDate = groupBy(entries, (entry) => monthDay(entry.row.takenOn));

  return { entries, byDay, byDate };
}

function onThisDay(index: Index, key: string): Entry | undefined {
  const matches = (index.byDate.get(monthDay(key)) ?? []).filter(
    (entry) =>
      entry.uploaded < key && aliveOn(entry, key) && yearOf(entry.row.takenOn) < yearOf(key),
  );

  return matches.sort((a, b) => yearOf(a.row.takenOn) - yearOf(b.row.takenOn) || byUpload(a, b))[0];
}

function cycleStart(replay: Replay, entries: readonly Entry[], key: string, seed: string): Replay {
  const members = entries.filter((entry) => entry.uploaded < key && aliveOn(entry, key));

  return { cycle: replay.cycle + 1, queue: shuffled(members, seed, replay.cycle + 1) };
}

function fromNextAlive(queue: readonly Entry[], key: string): Entry[] {
  const next = queue.findIndex((entry) => aliveOn(entry, key));

  return next === -1 ? [] : queue.slice(next);
}

function replayDay(replay: Replay, index: Index, key: string, seed: string): Replay {
  const special = onThisDay(index, key);

  const live = { ...replay, queue: fromNextAlive(replay.queue, key) };

  const started =
    special || live.queue.length > 0 ? live : cycleStart(live, index.entries, key, seed);

  const queue = [...started.queue, ...(index.byDay.get(key) ?? [])];

  if (special) return { ...started, queue, pick: special, special: true };

  return { ...started, queue: queue.slice(1), pick: queue[0], special: false };
}

export function pictureOfDay(
  photos: readonly PhotoRow[],
  dayKey: string,
  tz: string,
  seed: string,
): PictureOfDayPick | undefined {
  const entries = photos.map((row) => entryOf(row, tz)).sort(byUpload);

  const first = entries[0]?.uploaded;

  if (first === undefined || first > dayKey) return undefined;

  const index = indexOf(entries);

  let replay: Replay = { cycle: -1, queue: [] };

  for (let key = first; key <= dayKey; key = addDays(key, 1)) {
    replay = replayDay(replay, index, key, seed);
  }

  return pickOf(replay);
}

function pickOf({ pick, special }: Replay): PictureOfDayPick | undefined {
  if (pick === undefined) return undefined;

  return special ? { photo: pick.row, onThisDay: yearOf(pick.row.takenOn) } : { photo: pick.row };
}
