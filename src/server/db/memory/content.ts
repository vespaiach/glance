import "server-only";
import type { Repos } from "../database";
import { changedSince, copy, type ReadState } from "./state";

export function eventsRepo(state: ReadState): Repos["events"] {
  return {
    find: async (id) => copy(state().events.get(id)),
    save: async (accountId, event) => {
      state().events.set(event.id, { accountId, value: copy(event) });
    },
    changedSince: async (accountId, version) =>
      changedSince(state().events.values(), accountId, version),
  };
}

export function notesRepo(state: ReadState): Repos["notes"] {
  return {
    find: async (id) => copy(state().notes.get(id)),
    save: async (accountId, note) => {
      state().notes.set(note.id, { accountId, value: copy(note) });
    },
    live: async () =>
      [...state().notes.values()]
        .filter((note) => note.value.deletedAt === undefined)
        .map(copy)
        .sort((a, b) => compareKeys([a.accountId, a.value.id], [b.accountId, b.value.id])),
    changedSince: async (accountId, version) =>
      changedSince(state().notes.values(), accountId, version),
  };
}

export function tagsRepo(state: ReadState): Repos["tags"] {
  return {
    find: async (id) => copy(state().tags.get(id)),
    save: async (accountId, tag) => {
      if (tag.deletedAt === undefined && liveNameTaken(state, accountId, tag.id, tag.name)) {
        throw new Error(`Tag name ${tag.name} is taken`);
      }

      state().tags.set(tag.id, { accountId, value: copy(tag) });
    },
    hasAny: async (accountId) =>
      [...state().tags.values()].some((tag) => tag.accountId === accountId),
    liveIds: async (accountId, ids) =>
      new Set(ids.filter((id) => isLive(state().tags.get(id), accountId))),
    liveByName: async (accountId, name) =>
      copy(liveTags(state, accountId).find((tag) => sameName(tag.name, name))),
    changedSince: async (accountId, version) =>
      changedSince(state().tags.values(), accountId, version),
  };
}

export function photosRepo(state: ReadState): Repos["photos"] {
  return {
    find: async (accountId, id) => copy(ownPhoto(state, accountId, id)?.value),
    insert: async (accountId, photo, filePath) => {
      state().photos.set(photo.id, { accountId, value: copy(photo), filePath });
    },
    save: async (accountId, photo) => {
      const stored = ownPhoto(state, accountId, photo.id);

      if (stored) stored.value = copy(photo);
    },
    livePath: async (accountId, id) => {
      const stored = ownPhoto(state, accountId, id);

      return stored?.value.deletedAt === undefined ? stored?.filePath : undefined;
    },
    deletedPaths: async () =>
      [...state().photos.values()]
        .filter((photo) => photo.value.deletedAt !== undefined)
        .map((photo) => photo.filePath),
    changedSince: async (accountId, version) =>
      changedSince(state().photos.values(), accountId, version),
  };
}

export function settingsRepo(state: ReadState): Repos["settings"] {
  return {
    get: async (accountId) => copy(state().settings.get(accountId)),
    save: async (settings) => {
      state().settings.set(settings.accountId, copy(settings));
    },
    all: async () => [...state().settings.values()].map(copy),
    changedSince: async (accountId, version) => {
      const settings = state().settings.get(accountId);

      return settings && settings.version > version ? [copy(settings)] : [];
    },
  };
}

export function weatherCacheRepo(state: ReadState): Repos["weatherCache"] {
  return {
    get: async (accountId) => copy(state().weatherCache.get(accountId)),
    put: async (accountId, entry) => {
      state().weatherCache.set(accountId, copy(entry));
    },
  };
}

function compareKeys(a: string[], b: string[]): number {
  const at = a.findIndex((key, index) => key !== b[index]);

  if (at === -1) return 0;

  return (a[at] ?? "") < (b[at] ?? "") ? -1 : 1;
}

function sameName(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function isLive(
  tag: { accountId: string; value: { deletedAt?: string } } | undefined,
  accountId: string,
): boolean {
  return tag?.accountId === accountId && tag.value.deletedAt === undefined;
}

function liveTags(state: ReadState, accountId: string) {
  return [...state().tags.values()].filter((tag) => isLive(tag, accountId)).map((tag) => tag.value);
}

function liveNameTaken(state: ReadState, accountId: string, id: string, name: string): boolean {
  return liveTags(state, accountId).some((tag) => tag.id !== id && sameName(tag.name, name));
}

function ownPhoto(state: ReadState, accountId: string, id: string) {
  const stored = state().photos.get(id);

  return stored?.accountId === accountId ? stored : undefined;
}
