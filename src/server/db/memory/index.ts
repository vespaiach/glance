import "server-only";
import type { Database, Repos } from "../database";
import { accountsRepo, displaysRepo, magicLinksRepo, sessionsRepo, signInCodesRepo } from "./auth";
import {
  eventsRepo,
  notesRepo,
  photosRepo,
  settingsRepo,
  tagsRepo,
  weatherCacheRepo,
} from "./content";
import { copy, emptyState, type ReadState } from "./state";

type Lock = <T>(fn: () => Promise<T>) => Promise<T>;

export function openMemoryDatabase(): Database {
  let state = emptyState();

  const lock = createLock();

  return {
    ...locked(
      repos(() => state),
      lock,
    ),
    tx: (fn) =>
      lock(async () => {
        const draft = copy(state);

        const result = await fn(joined(() => draft));

        state = draft;

        return result;
      }),
  };
}

function joined(state: ReadState): Database {
  const db: Database = { ...repos(state), tx: (fn) => fn(db) };

  return db;
}

function repos(state: ReadState): Repos {
  return {
    versions: versionsRepo(state),
    accounts: accountsRepo(state),
    displays: displaysRepo(state),
    sessions: sessionsRepo(state),
    signInCodes: signInCodesRepo(state),
    magicLinks: magicLinksRepo(state),
    events: eventsRepo(state),
    notes: notesRepo(state),
    tags: tagsRepo(state),
    photos: photosRepo(state),
    settings: settingsRepo(state),
    weatherCache: weatherCacheRepo(state),
  };
}

function versionsRepo(state: ReadState): Repos["versions"] {
  return {
    current: async () => state().version,
    next: async () => {
      state().version += 1;

      return state().version;
    },
  };
}

function createLock(): Lock {
  let tail: Promise<unknown> = Promise.resolve();

  return (fn) => {
    const run = tail.then(fn, fn);

    tail = run.catch(() => undefined);

    return run;
  };
}

function locked(all: Repos, lock: Lock): Repos {
  const entries = Object.entries(all).map(([name, repo]) => [name, lockedRepo(repo, lock)]);

  return Object.fromEntries(entries) as Repos;
}

function lockedRepo(repo: object, lock: Lock): object {
  const entries = Object.entries(repo).map(([name, call]) => [
    name,
    (...args: unknown[]) => lock(() => (call as (...args: unknown[]) => Promise<unknown>)(...args)),
  ]);

  return Object.fromEntries(entries);
}
